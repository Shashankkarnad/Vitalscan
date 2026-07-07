'use client'

import { useCallback, useRef, useState } from 'react'
import { formatBytes } from '@/lib/utils'
import { COLOR, rgba } from '@/lib/vitalscan/tokens'

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

  const borderColor = dragging ? rgba(COLOR.teal, 0.55) : picked ? rgba(COLOR.teal, 0.35) : 'rgba(234,234,234,.14)'
  const background = dragging ? rgba(COLOR.teal, 0.06) : picked ? rgba(COLOR.teal, 0.04) : 'transparent'

  return (
    <button
      type="button"
      aria-label="Drop zone — click or drag your Apple Health export here"
      className={['vs-dropzone', !dragging && !picked ? 'vs-dropzone-idle' : ''].join(' ').trim()}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 16,
        border: `1.5px dashed ${borderColor}`,
        background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '44px 24px',
        cursor: 'pointer',
        transition: 'border-color .2s ease, background .2s ease',
      }}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: rgba(COLOR.teal, 0.12),
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: COLOR.teal }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#eaeaea', fontWeight: 600, fontSize: 13.5 }}>{picked.name}</p>
            <p style={{ color: 'rgba(234,234,234,.45)', fontSize: 12, marginTop: 2 }}>{formatBytes(picked.size)}</p>
          </div>
          <p style={{ color: 'rgba(234,234,234,.4)', fontSize: 12 }}>Click to choose a different file</p>
        </>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: dragging ? rgba(COLOR.teal, 0.15) : 'rgba(234,234,234,.05)',
              transition: 'background .2s ease',
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: dragging ? COLOR.teal : 'rgba(234,234,234,.45)' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#eaeaea', fontWeight: 600, fontSize: 13.5 }}>
              {dragging ? 'Drop to upload' : 'Drop your export.zip here'}
            </p>
            <p style={{ color: 'rgba(234,234,234,.45)', fontSize: 12, marginTop: 2 }}>
              or click to browse — only .zip files
            </p>
          </div>
        </>
      )}
    </button>
  )
}
