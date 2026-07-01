'use client'

const steps = [
  {
    num: 1,
    title: 'Open Health app',
    detail: 'Tap your profile photo in the top-right corner.',
  },
  {
    num: 2,
    title: 'Export all health data',
    detail: 'Scroll down → "Export All Health Data" → Share the .zip.',
  },
  {
    num: 3,
    title: 'Drop the file here',
    detail: 'The file stays on your device — nothing is uploaded to a server.',
  },
]

export default function ExportSteps() {
  return (
    <ol className="flex flex-col gap-4 text-sm">
      {steps.map((s) => (
        <li key={s.num} className="flex gap-3 items-start">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal/10 text-teal flex items-center justify-center font-semibold text-xs border border-teal/20">
            {s.num}
          </span>
          <div>
            <p className="font-medium text-foreground">{s.title}</p>
            <p className="text-muted-foreground leading-relaxed mt-0.5">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
