import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// eslint-disable-next-line react-refresh/only-export-components
function ErrorDialog({ error }: { error: Error }) {
  const text = `${error.message}\n\n${error.stack ?? ''}`.trim()

  function copy() {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          color: '#f5f5f5',
          borderRadius: '1rem',
          padding: '1.5rem',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="#ef4444">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>Something went wrong</span>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#ef4444', marginBottom: '0.75rem', wordBreak: 'break-word' }}>
          {error.message}
        </p>

        {error.stack && (
          <pre
            style={{
              fontSize: '0.7rem',
              color: '#a0a0a0',
              background: '#111',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: '200px',
              marginBottom: '1rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {error.stack}
          </pre>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              flex: 1,
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
          <button
            onClick={copy}
            style={{
              flex: 1,
              padding: '0.5rem 1rem',
              background: '#2a2a2a',
              color: '#d4d4d4',
              border: '1px solid #3a3a3a',
              borderRadius: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Copy error
          </button>
        </div>
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorDialog error={this.state.error} />
    }
    return this.props.children
  }
}
