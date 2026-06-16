import { Component, type ReactNode } from 'react'
import { Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen flex items-center justify-center bg-bg">
          <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-danger-subtle flex items-center justify-center">
              <span className="text-danger text-2xl font-bold">!</span>
            </div>
            <h1 className="text-text text-title-2 font-semibold">出现了一些问题</h1>
            <p className="text-text-secondary text-caption">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-white font-medium text-callout hover:bg-accent-hover transition-colors duration-fast"
            >
              <Home size={16} strokeWidth={1.5} />
              返回首页
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
