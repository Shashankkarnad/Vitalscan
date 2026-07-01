'use client'

import { useCallback, useRef, useState } from 'react'
import { formatBytes } from '@/lib/utils'

interface Props {
  onFile: (file: File) => void
}

const ACCEPT = '.zip,application/zip,application/x-zip-compressed'

export default function DropZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)
  const [picked, setPicked] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      setPicked(file)
      onFile(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      handleFile(e.dataTransfer.files[0])
    },
    [handleFile],
  )

  return (
    <button
      type="button"
      aria-label="Drop zone — click or drag your Apple Health export here"
      className={[
        'relative w-full rounded-2xl border-2 border-dashed transition-all duration-200',
        'flex flex-col items-center justify-center gap-3 py-12 px-6 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dragging
          ? 'border-teal bg-teal/5 scale-[1.01]'
          : picked
            ? 'border-clinical-green bg-clinical-green/5'
            : 'border-border hover:border-teal/50 hover:bg-secondary/60',
      ].join(' ')}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {picked ? (
        <>
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-clinical-green/10">
            <svg
              className="text-clinical-green"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-sm">{picked.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(picked.size)}</p>
          </div>
          <p className="text-xs text-muted-foreground">Click to choose a different file</p>
        </>
      ) : (
        <>
          <div
            className={[
              'flex items-center justify-center w-14 h-14 rounded-full transition-colors',
              dragging ? 'bg-teal/15' : 'bg-secondary',
            ].join(' ')}
          >
            <svg
              className={dragging ? 'text-teal' : 'text-muted-foreground'}
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-sm">
              {dragging ? 'Drop to upload' : 'Drop your export.zip here'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse — only .zip files</p>
          </div>
        </>
      )}
    </button>
  )
}
