import { CircleHelp, FilePenLine, FileText } from 'lucide-react'

const icons = {
  documents: FileText,
  review: FilePenLine,
  help: CircleHelp,
}

export default function AppIcon({ name, size = 21, strokeWidth = 1.6, ...props }) {
  const Icon = icons[name]

  if (!Icon) return null

  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />
}
