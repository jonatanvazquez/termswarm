import { useState } from 'react'
import { Check, Eye, EyeOff, FolderOpen, GitBranch, Loader2, X } from 'lucide-react'
import type { SSHConnectionSaved } from '../../../../shared/sshTypes'
import { useConnectionStore } from '../../store/connectionStore'

interface ConnectionFormProps {
  initial?: SSHConnectionSaved
  onSave: (conn: Omit<SSHConnectionSaved, 'id'>) => void
  onCancel: () => void
}

export function ConnectionForm({ initial, onSave, onCancel }: ConnectionFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [host, setHost] = useState(initial?.host ?? '')
  const [port, setPort] = useState(initial?.port ?? 22)
  const [username, setUsername] = useState(initial?.username ?? '')
  const [authMethod, setAuthMethod] = useState<'key' | 'password'>(initial?.authMethod ?? 'key')
  const [privateKeyPath, setPrivateKeyPath] = useState(initial?.privateKeyPath ?? '')
  const [password, setPassword] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [gitToken, setGitToken] = useState(initial?.gitToken ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

  const testConnection = useConnectionStore((s) => s.testConnection)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testConnection({
      id: initial?.id ?? 'test',
      name,
      host,
      port,
      username,
      authMethod,
      privateKeyPath: authMethod === 'key' ? privateKeyPath : undefined,
      password: authMethod === 'password' ? password : undefined,
      passphrase: authMethod === 'key' ? passphrase : undefined
    })
    setTestResult(result)
    setTesting(false)
  }

  const handleBrowseKey = async () => {
    const selected = await window.api.selectDirectory()
    if (selected) {
      setPrivateKeyPath(selected)
    }
  }

  const handleSubmit = () => {
    if (!name.trim() || !host.trim() || !username.trim()) return
    onSave({
      name: name.trim(),
      host: host.trim(),
      port,
      username: username.trim(),
      authMethod,
      privateKeyPath: authMethod === 'key' ? privateKeyPath : undefined,
      gitToken: gitToken.trim() || undefined
    })
  }

  const canSubmit = name.trim() && host.trim() && username.trim()

  return (
    <div className="flex flex-col gap-3">
      {/* Name */}
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
          Connection Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Server"
          className="w-full rounded border border-border-default bg-surface-0 px-2.5 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
        />
      </div>

      {/* Host + Port */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Host
          </label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="192.168.1.100"
            className="w-full rounded border border-border-default bg-surface-0 px-2.5 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
          />
        </div>
        <div className="w-20">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Port
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
            className="w-full rounded border border-border-default bg-surface-0 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Username */}
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
          Username
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="root"
          className="w-full rounded border border-border-default bg-surface-0 px-2.5 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
        />
      </div>

      {/* Auth Method Toggle */}
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
          Authentication
        </label>
        <div className="flex rounded bg-surface-0 p-0.5">
          <button
            onClick={() => setAuthMethod('key')}
            className={`flex-1 rounded px-3 py-1 text-[11px] font-medium transition-colors ${
              authMethod === 'key'
                ? 'bg-accent/15 text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            SSH Key
          </button>
          <button
            onClick={() => setAuthMethod('password')}
            className={`flex-1 rounded px-3 py-1 text-[11px] font-medium transition-colors ${
              authMethod === 'password'
                ? 'bg-accent/15 text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Password
          </button>
        </div>
      </div>

      {/* Key Path or Password */}
      {authMethod === 'key' ? (
        <>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
              Private Key Path
            </label>
            <div className="flex gap-1.5">
              <input
                value={privateKeyPath}
                onChange={(e) => setPrivateKeyPath(e.target.value)}
                placeholder="~/.ssh/id_rsa"
                className="flex-1 rounded border border-border-default bg-surface-0 px-2.5 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
              />
              <button
                onClick={handleBrowseKey}
                className="rounded border border-border-default bg-surface-0 px-2 py-1.5 text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
              >
                <FolderOpen size={12} />
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
              Passphrase (optional)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Key passphrase..."
                className="w-full rounded border border-border-default bg-surface-0 px-2.5 py-1.5 pr-8 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="SSH password..."
              className="w-full rounded border border-border-default bg-surface-0 px-2.5 py-1.5 pr-8 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-border-default" />

      {/* Git Token (optional) */}
      <div>
        <label className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
          <GitBranch size={10} />
          Git Token (optional)
        </label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={gitToken}
            onChange={(e) => setGitToken(e.target.value)}
            placeholder="ghp_... or personal access token"
            className="w-full rounded border border-border-default bg-surface-0 px-2.5 py-1.5 pr-8 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
          />
          <button
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <p className="mt-0.5 text-[9px] text-text-secondary/60">
          For cloning private repos. Stored on the server, not locally.
        </p>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`rounded px-2.5 py-1.5 text-[11px] ${
            testResult.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}
        >
          {testResult.success ? 'Connection successful!' : `Failed: ${testResult.error}`}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleTest}
          disabled={!canSubmit || testing}
          className="flex items-center gap-1.5 rounded bg-white/10 px-3 py-1.5 text-[11px] font-medium text-text-primary transition-colors hover:bg-white/15 disabled:opacity-40"
        >
          {testing ? <Loader2 size={12} className="animate-spin" /> : null}
          Test Connection
        </button>
        <div className="flex gap-1.5">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-[11px] text-text-secondary hover:bg-white/10 hover:text-text-primary"
          >
            <X size={12} />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-40"
          >
            <Check size={12} />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
