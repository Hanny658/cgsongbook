'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    errorType?: 'chunk' | 'render' | 'unknown'
    errorMessage?: string
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
        }
    }

    static getDerivedStateFromError(error: Error): State {
        const message = error.message || ''

        // Detect a ChunkLoadError
        if (message.includes('ChunkLoadError') || /loading chunk \d+ failed/i.test(message)) {
            return {
                hasError: true,
                errorType: 'chunk',
                errorMessage: message,
            }
        }

        return {
            hasError: true,
            errorType: 'render',
            errorMessage: message,
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)

        // Reload once automatically on a chunk load failure (the flag avoids a reload loop)
        if (
            error?.message?.includes('ChunkLoadError') &&
            typeof window !== 'undefined' &&
            !window.location.href.includes('reloaded=true')
        ) {
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.set('reloaded', 'true')
            window.location.href = newUrl.toString()
        }
    }

    handleReload = () => {
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            // Error page UI
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 px-6">
                    <h1 className="text-4xl font-bold text-red-600 mb-4">Something went wrong</h1>
                    <p className="text-lg text-gray-700 mb-3">
                        {this.state.errorType === 'chunk'
                            ? 'Part of the page failed to load, possibly due to an unstable network or a site update.'
                            : 'An error occurred while rendering the page.'}
                    </p>

                    {this.state.errorMessage && (
                        <pre className="bg-white border border-red-200 text-red-800 p-4 rounded shadow max-w-xl text-sm overflow-auto">
                            {this.state.errorMessage}
                        </pre>
                    )}

                    <button
                        onClick={this.handleReload}
                        className="mt-6 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Reload page
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
