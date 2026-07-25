'use client'
// components/chat/order-chat.tsx — Realtime chat with photos
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type Message = {
  id: string
  sender_role: 'customer' | 'shopper'
  content: string | null
  image_url: string | null
  type: 'text' | 'image' | 'system'
  created_at: string
  sender_id: string
}

type Props = {
  orderId: string
  myRole: 'customer' | 'shopper'
  myUserId: string
  disabled?: boolean
}

export function OrderChat({ orderId, myRole, myUserId, disabled }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at')
    setMessages(data || [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`chat-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendText = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('chat_messages').insert({
      order_id: orderId,
      sender_id: myUserId,
      sender_role: myRole,
      content: text.trim(),
      type: 'text',
    })
    setSending(false)
    if (error) { toast.error('Nachricht konnte nicht gesendet werden'); return }
    setText('')
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Bild zu groß (max. 5 MB)'); return }
    setPreviewFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const sendImage = async () => {
    if (!previewFile) return
    setUploading(true)
    const ext = previewFile.name.split('.').pop()
    const path = `${orderId}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('chat-images')
      .upload(path, previewFile, { upsert: true })
    if (uploadErr) { toast.error('Upload fehlgeschlagen'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path)

    await supabase.from('chat_messages').insert({
      order_id: orderId,
      sender_id: myUserId,
      sender_role: myRole,
      image_url: publicUrl,
      content: text.trim() || null,
      type: 'image',
    })
    setUploading(false)
    setPreview(null)
    setPreviewFile(null)
    setText('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const isMine = (msg: Message) => msg.sender_id === myUserId

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-8">
            Noch keine Nachrichten. Schreiben Sie Ihrem {myRole === 'customer' ? 'Shopper' : 'Kunden'}!
          </div>
        )}
        {messages.map(msg => {
          if (msg.type === 'system') return (
            <div key={msg.id} className="text-center">
              <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
            </div>
          )
          const mine = isMine(msg)
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl overflow-hidden ${
                mine
                  ? 'bg-red text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'
              }`}>
                {msg.image_url && (
                  <img
                    src={msg.image_url}
                    alt="Foto"
                    className="w-full max-w-xs object-cover cursor-pointer"
                    onClick={() => window.open(msg.image_url!, '_blank')}
                  />
                )}
                {msg.content && (
                  <div className="px-3 py-2 text-sm">{msg.content}</div>
                )}
                <div className={`px-3 pb-1.5 text-[10px] ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {preview && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img src={preview} alt="Preview" className="h-24 rounded-xl object-cover" />
            <button
              onClick={() => { setPreview(null); setPreviewFile(null); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red text-white rounded-full flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!disabled && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:border-red hover:text-red transition-colors flex-shrink-0"
          >
            <ImageIcon size={16} />
          </button>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); preview ? sendImage() : sendText() } }}
            placeholder="Nachricht schreiben..."
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-red transition-colors bg-white"
          />
          <button
            onClick={() => preview ? sendImage() : sendText()}
            disabled={sending || uploading || (!text.trim() && !preview)}
            className="w-9 h-9 rounded-xl bg-red text-white flex items-center justify-center hover:bg-red-dark transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {(sending || uploading) ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      )}
    </div>
  )
}
