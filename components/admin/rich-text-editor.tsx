"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  ListOrdered,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pilcrow,
  Eraser,
} from "lucide-react"
import { sanitizeRichText, toSafeHtml } from "@/lib/rich-text"

interface RichTextEditorProps {
  value: string | undefined | null
  onChange: (html: string) => void
  placeholder?: string
}

const COLORS = [
  { label: "Espresso", cls: "gl-c-espresso", swatch: "#28170F" },
  { label: "Zlatá", cls: "gl-c-gold", swatch: "#E09E14" },
  { label: "Taupe", cls: "gl-c-taupe", swatch: "#8C6F4E" },
  { label: "Krémová", cls: "gl-c-cream", swatch: "#F5E3C2" },
]

const SIZES = [
  { label: "Normálny", cls: "gl-text-normal" },
  { label: "Malý", cls: "gl-text-small" },
  { label: "Veľký", cls: "gl-text-large" },
  { label: "Zvýraznený", cls: "gl-text-highlight" },
]

const BLOCK_TAGS = ["P", "H3", "H4", "LI", "DIV"]

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const focusedRef = useRef(false)
  const [, force] = useState(0)

  // Initialize / re-sync content from the value prop, but never while the user
  // is editing (avoids cursor jumps). The editor is otherwise uncontrolled.
  useEffect(() => {
    const el = ref.current
    if (!el || focusedRef.current) return
    const incoming = toSafeHtml(value)
    if (el.innerHTML !== incoming) el.innerHTML = incoming
  }, [value])

  // Ensure formatting uses tags (<b>, <i>) rather than inline styles so the
  // sanitizer keeps them.
  const ensureTagMode = () => {
    try {
      document.execCommand("styleWithCSS", false, "false")
    } catch {
      /* no-op */
    }
  }

  const emitChange = () => {
    const el = ref.current
    if (!el) return
    onChange(sanitizeRichText(el.innerHTML))
  }

  const exec = (command: string, arg?: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    ensureTagMode()
    document.execCommand(command, false, arg)
    emitChange()
    force((n) => n + 1)
  }

  const setBlock = (tag: "p" | "h3" | "h4") => exec("formatBlock", tag)

  const addLink = () => {
    const url = window.prompt("Zadajte odkaz (https://…, mailto:…, #sekcia):", "https://")
    if (!url) return
    exec("createLink", url.trim())
  }

  // Find the nearest block element inside the editor for the current selection.
  const currentBlock = (): HTMLElement | null => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    let node: Node | null = sel.getRangeAt(0).startContainer
    const root = ref.current
    while (node && node !== root) {
      if (node.nodeType === 1 && BLOCK_TAGS.includes((node as HTMLElement).tagName)) {
        return node as HTMLElement
      }
      node = node.parentNode
    }
    return null
  }

  const applyAlign = (cls: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const block = currentBlock()
    if (block && block !== el) {
      block.classList.remove("gl-align-left", "gl-align-center", "gl-align-right")
      block.classList.add(cls)
    }
    emitChange()
    force((n) => n + 1)
  }

  // Wrap the current selection in a brand span (color or size). Replacing the
  // selection with sanitized HTML keeps output locked to the allow-list.
  const wrapSelection = (cls: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const text = sel.toString()
    if (!text) return
    const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    ensureTagMode()
    document.execCommand("insertHTML", false, `<span class="${cls}">${safe}</span>`)
    emitChange()
    force((n) => n + 1)
  }

  const clearFormatting = () => {
    const el = ref.current
    if (!el) return
    el.focus()
    ensureTagMode()
    document.execCommand("removeFormat")
    // Also drop alignment/brand classes on the active block.
    const block = currentBlock()
    if (block && block !== el) block.removeAttribute("class")
    emitChange()
    force((n) => n + 1)
  }

  const btn =
    "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded text-[#F5E3C2]/80 hover:bg-[#8C6F4E]/30 hover:text-[#F5E3C2] transition-colors"
  const sep = "w-px self-stretch bg-[#8C6F4E]/30 mx-0.5"

  return (
    <div className="rounded-lg border border-[#8C6F4E]/50 bg-[#28170F] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#8C6F4E]/30 bg-[#3a251a] px-2 py-1.5">
        <button type="button" className={btn} title="Tučné" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={btn} title="Kurzíva" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={btn} title="Podčiarknuté" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </button>

        <span className={sep} />

        <button type="button" className={btn} title="Odsek" onMouseDown={(e) => e.preventDefault()} onClick={() => setBlock("p")}>
          <Pilcrow className="h-4 w-4" />
        </button>
        <button type="button" className={btn} title="Nadpis" onMouseDown={(e) => e.preventDefault()} onClick={() => setBlock("h3")}>
          <Heading className="h-4 w-4" />
        </button>
        <button type="button" className={`${btn} text-xs font-semibold`} title="Menší nadpis" onMouseDown={(e) => e.preventDefault()} onClick={() => setBlock("h4")}>
          H4
        </button>

        <span className={sep} />

        <button type="button" className={btn} title="Odrážkový zoznam" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={btn} title="Číslovaný zoznam" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={btn} title="Odkaz" onMouseDown={(e) => e.preventDefault()} onClick={addLink}>
          <Link2 className="h-4 w-4" />
        </button>

        <span className={sep} />

        <button type="button" className={btn} title="Zarovnať vľavo" onMouseDown={(e) => e.preventDefault()} onClick={() => applyAlign("gl-align-left")}>
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" className={btn} title="Zarovnať na stred" onMouseDown={(e) => e.preventDefault()} onClick={() => applyAlign("gl-align-center")}>
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" className={btn} title="Zarovnať vpravo" onMouseDown={(e) => e.preventDefault()} onClick={() => applyAlign("gl-align-right")}>
          <AlignRight className="h-4 w-4" />
        </button>

        <span className={sep} />

        {/* Brand color (applies to selected text) */}
        <select
          aria-label="Farba textu"
          title="Farba textu (výber označeného textu)"
          className="h-8 rounded bg-[#28170F] border border-[#8C6F4E]/40 text-xs text-[#F5E3C2]/80 px-1"
          value=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value) wrapSelection(e.target.value)
            e.target.value = ""
          }}
        >
          <option value="">Farba</option>
          {COLORS.map((c) => (
            <option key={c.cls} value={c.cls}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Brand size (applies to selected text) */}
        <select
          aria-label="Veľkosť textu"
          title="Veľkosť textu (výber označeného textu)"
          className="h-8 rounded bg-[#28170F] border border-[#8C6F4E]/40 text-xs text-[#F5E3C2]/80 px-1"
          value=""
          onChange={(e) => {
            if (e.target.value) wrapSelection(e.target.value)
            e.target.value = ""
          }}
        >
          <option value="">Veľkosť</option>
          {SIZES.map((s) => (
            <option key={s.cls} value={s.cls}>
              {s.label}
            </option>
          ))}
        </select>

        <span className={sep} />

        <button type="button" className={btn} title="Vyčistiť formátovanie" onMouseDown={(e) => e.preventDefault()} onClick={clearFormatting}>
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder || "Začnite písať…"}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={() => {
          focusedRef.current = false
          emitChange()
        }}
        onInput={emitChange}
        className="gl-prose gl-prose-light gl-editor min-h-28 px-3 py-2.5 text-sm text-[#F5E3C2] focus:outline-none"
      />
    </div>
  )
}
