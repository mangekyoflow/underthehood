import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Key, Lock, Unlock, RefreshCw, Send } from 'lucide-react';

interface Props {
  currentStep: number;
}

interface RatchetMessage {
  id: number;
  sender: 'Alice' | 'Bob';
  text: string;
  messageKey: string;
  dhEpoch: number;
  isCompromised: boolean;
}

export const E2eeVisualizer: React.FC<Props> = ({ currentStep: _currentStep }) => {
  const [messages, setMessages] = useState<RatchetMessage[]>([
    {
      id: 1,
      sender: 'Alice',
      text: 'Hey Bob, is our conversation secure?',
      messageKey: 'mk_7f9a1b02_epoch1',
      dhEpoch: 1,
      isCompromised: false,
    },
    {
      id: 2,
      sender: 'Bob',
      text: 'Yes! We use Signal Double Ratchet with ephemeral keys.',
      messageKey: 'mk_3c88e91d_epoch1',
      dhEpoch: 1,
      isCompromised: false,
    },
  ]);

  const [compromisedEpoch, setCompromisedEpoch] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');

  const currentEpoch = messages.length > 0 ? messages[messages.length - 1].dhEpoch : 1;

  const sendMessage = (sender: 'Alice' | 'Bob') => {
    if (!inputText.trim()) return;
    const nextSender = sender;
    const isNewDhTurn = messages.length > 0 && messages[messages.length - 1].sender !== nextSender;
    const nextEpoch = isNewDhTurn ? currentEpoch + 1 : currentEpoch;
    const randomHex = Math.random().toString(16).substring(2, 10);

    const newMsg: RatchetMessage = {
      id: messages.length + 1,
      sender: nextSender,
      text: inputText,
      messageKey: `mk_${randomHex}_epoch${nextEpoch}`,
      dhEpoch: nextEpoch,
      isCompromised: compromisedEpoch === nextEpoch,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const simulateCompromise = (epoch: number) => {
    setCompromisedEpoch(epoch);
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        isCompromised: m.dhEpoch === epoch,
      }))
    );
  };

  const resetAll = () => {
    setMessages([
      {
        id: 1,
        sender: 'Alice',
        text: 'Hey Bob, is our conversation secure?',
        messageKey: 'mk_7f9a1b02_epoch1',
        dhEpoch: 1,
        isCompromised: false,
      },
      {
        id: 2,
        sender: 'Bob',
        text: 'Yes! We use Signal Double Ratchet with ephemeral keys.',
        messageKey: 'mk_3c88e91d_epoch1',
        dhEpoch: 1,
        isCompromised: false,
      },
    ]);
    setCompromisedEpoch(null);
  };

  return (
    <div className="w-full bg-parchment-50 dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 rounded-2xl p-6 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-parchment-200 dark:border-parchment-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-parchment-400 dark:text-parchment-400">
            End-to-End Cryptography & Ratchet Protocols
          </span>
          <h3 className="text-xl font-serif font-semibold text-ink-light dark:text-ink-dark flex items-center gap-2">
            The Double Ratchet Protocol (Signal / WhatsApp)
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => simulateCompromise(currentEpoch)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              compromisedEpoch !== null
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold'
                : 'bg-parchment-100 dark:bg-parchment-800 border-parchment-300 text-ink-muted'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Simulate Key Leak at Epoch {currentEpoch}:{' '}
            {compromisedEpoch !== null ? 'ACTIVE' : 'NONE'}
          </button>

          <button
            onClick={resetAll}
            className="p-1.5 rounded-lg border border-parchment-300 dark:border-parchment-700 bg-white dark:bg-parchment-950 text-ink-muted hover:text-ink-light transition-colors"
            title="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Chat Messenger Simulator */}
      <div className="my-5 p-4 rounded-xl bg-parchment-100 dark:bg-parchment-950 border border-parchment-200 dark:border-parchment-800">
        {/* Message Bubble Thread */}
        <div className="space-y-3 max-h-60 overflow-y-auto p-2">
          {messages.map((m) => {
            const isAlice = m.sender === 'Alice';
            return (
              <div key={m.id} className={`flex flex-col ${isAlice ? 'items-start' : 'items-end'}`}>
                <div className="flex items-center gap-1 text-[10px] font-mono text-ink-muted mb-0.5">
                  <span>{m.sender}</span>
                  <span>•</span>
                  <span>DH Epoch {m.dhEpoch}</span>
                  <span>•</span>
                  <code className="text-[9px] text-parchment-400">{m.messageKey}</code>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-sm text-xs font-sans shadow-xs flex items-start gap-2 ${
                    m.isCompromised
                      ? 'bg-red-500/20 border border-red-500/40 text-red-900 dark:text-red-200'
                      : isAlice
                        ? 'bg-white dark:bg-parchment-900 border border-parchment-200 dark:border-parchment-800 text-ink-light dark:text-ink-dark'
                        : 'bg-blue-600 text-white'
                  }`}
                >
                  <div className="flex-1">
                    <p className="leading-relaxed">{m.text}</p>
                    <div className="mt-1 flex items-center gap-1 text-[9px] font-mono opacity-80">
                      {m.isCompromised ? (
                        <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-0.5">
                          <Unlock className="w-3 h-3" /> Eavesdropper Decrypted (Key Leaked)
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Forward Secret (One-time key)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dispatch Message Bar */}
        <div className="mt-4 pt-3 border-t border-parchment-200 dark:border-parchment-800 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Type confidential message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-parchment-900 border border-parchment-300 dark:border-parchment-700 text-ink-light dark:text-ink-dark focus:outline-none focus:border-blue-500"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => sendMessage('Alice')}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" /> Alice Sends
            </button>
            <button
              onClick={() => sendMessage('Bob')}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" /> Bob Sends
            </button>
          </div>
        </div>
      </div>

      {/* Visual Ratchet Mechanics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs font-mono">
        {/* Ratchet 1: Diffie-Hellman Asymmetric Ratchet */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-purple-500" /> 1. Diffie-Hellman Ratchet
                (Turn-based)
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                Epoch {currentEpoch}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
              Whenever the speaking role changes between Alice and Bob, a new Curve25519 keypair is
              published. The shared secret g^(ab) is mixed into the Root KDF Chain.
            </p>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded border border-purple-200 dark:border-purple-900/40 text-[10px] text-purple-800 dark:text-purple-300">
              Post-Compromise Security (Future Secrecy): If an attacker gains temporary key access,
              the very next DH turn introduces uncompromised entropy, healing the protocol!
            </div>
          </div>
        </div>

        {/* Ratchet 2: Symmetric KDF Chain Ratchet */}
        <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-parchment-100 dark:border-parchment-800">
              <span className="font-bold text-ink-light dark:text-ink-dark flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-500" /> 2. Symmetric KDF Ratchet (Per-message)
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                1 Message = 1 Key
              </span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
              For every single message sent, HKDF advances the Chain Key: <br />
              <code className="text-blue-600 dark:text-blue-400 font-bold">
                CK_{'{i+1}'}, MK_i = KDF(CK_i)
              </code>
              .<br />
              The message key $MK_i$ is instantly destroyed after encrypting.
            </p>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-900/40 text-[10px] text-blue-800 dark:text-blue-300">
              Forward Secrecy: Because hash functions are mathematically one-way, an attacker
              compromising key $MK_5$ cannot reverse hash calculations to read messages 1 through 4.
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Banner */}
      <div className="p-4 rounded-xl border border-parchment-200 dark:border-parchment-800 bg-white dark:bg-parchment-950 font-mono text-xs">
        {compromisedEpoch !== null ? (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                SELF-HEALING CRYPTO TEST: Notice Post-Compromise Security
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                Epoch {compromisedEpoch} keys were simulated as leaked. But watch: as soon as the
                other party replies, a new Diffie-Hellman ratchet step triggers. Future messages
                will be completely re-encrypted with fresh secrets that the attacker CANNOT read!
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">
                END-TO-END ENCRYPTED: Zero Knowledge on the Server
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                Every message is encrypted on Alice's device and can only be decrypted on Bob's
                device. WhatsApp, Signal, and cloud relays see only opaque ciphertext blocks and
                have no technical capability to decrypt wire frames.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
