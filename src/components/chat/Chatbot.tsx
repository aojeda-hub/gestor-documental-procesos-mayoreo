import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Bot, User, Loader2, Sparkles, Minus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  /** Accesos directos a la pantalla donde está el dato. */
  links?: { label: string; path: string }[];
}

// Preguntas de ejemplo: muestran qué sabe responder con datos del sistema.
const SUGERENCIAS = [
  '¿Qué tengo pendiente?',
  '¿Qué proyectos de mi silo están atrasados?',
  '¿Qué actividades del cronograma tocan este mes?',
  '¿Cuántas normas aprobadas hay en Personal?',
];

export const Chatbot: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola. Consulto los datos del sistema por ti: tus pendientes, proyectos, cronograma, documentos, Mapa de Procesos, indicadores e incidencias.',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (texto?: string) => {
    const pregunta = (texto ?? input).trim();
    if (!pregunta || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: pregunta,
      timestamp: new Date(),
    };

    const history = [...messages, userMessage];
    setMessages(history);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: history.slice(-12).map((m) => ({ role: m.role, content: m.content })) },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error + (data.hint ? ` (${data.hint})` : ''));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        links: Array.isArray(data.links) ? data.links : [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'No pude responder en este momento. Intenta de nuevo en unos segundos.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '60px' : '500px',
              width: isMinimized ? '300px' : '380px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "mb-4 overflow-hidden rounded-2xl border bg-card shadow-2xl transition-all duration-300 ease-in-out",
              isMinimized ? "flex items-center px-4" : "flex flex-col"
            )}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between bg-primary p-4 text-primary-foreground",
              isMinimized && "w-full bg-transparent p-0 text-foreground"
            )}>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-none">Asistente Inteligente de Procesos</h3>
                  {!isMinimized && <p className="mt-1 text-[10px] opacity-80">En línea • Gemini 3.6 Flash</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-white/10" 
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Sparkles className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-white/10" 
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex w-full gap-2",
                          msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                          msg.role === 'user' ? "bg-muted" : "bg-primary/10 text-primary border-primary/20"
                        )}>
                          {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          msg.role === 'user' 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-muted rounded-tl-none prose prose-sm dark:prose-invert"
                        )}>
                          {msg.content.split('\n').filter(l => l.trim()).map((line, i) => (
                            <p key={i} className={cn(i > 0 && "mt-1", line.trim().startsWith('- ') && "pl-2")}>{line}</p>
                          ))}
                          {msg.links && msg.links.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 not-prose">
                              {msg.links.map((l) => (
                                <button
                                  key={l.path + l.label}
                                  type="button"
                                  onClick={() => { navigate(l.path); setIsMinimized(true); }}
                                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-background px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                                >
                                  {l.label} <ArrowRight className="h-3 w-3" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {messages.length === 1 && !isLoading && (
                      <div className="flex flex-col gap-1.5 pl-10">
                        {SUGERENCIAS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSend(s)}
                            className="rounded-lg border px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    {isLoading && (
                      <div className="flex gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                          <Bot className="h-4 w-4 animate-pulse" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="border-t p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Escribe tu pregunta..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading}
                      className="bg-muted border-none focus-visible:ring-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">
                    Impulsado por IA para mejorar tu gestión
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </motion.div>
    </div>
  );
};

export default Chatbot;
