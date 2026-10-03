import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Type,
  PenTool,
  Undo2,
  Redo2,
  Download,
  Printer,
  MoreVertical,
  FileText,
  Copy,
  ExternalLink,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const ZOOM_PRESETS = [50, 60, 75, 85, 100, 125, 150, 200]

export default function DocumentViewer({
  fileUrl,
  fileName,
  format: propFormat,
  extractedText,
  viewMode = 'native',
  onViewModeChange,
}) {
  const containerRef = useRef(null)
  const [numPages, setNumPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [zoom, setZoom] = useState(85) // Default 85% matching reference
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [fitMode, setFitMode] = useState('none') // 'none', 'fit-width', 'fit-page'
  const [isContinuous, setIsContinuous] = useState(true)
  const [activeTool, setActiveTool] = useState('select') // 'select', 'annotate'
  const [pdfDoc, setPdfDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const format = (propFormat || fileName?.split('.').pop() || '').toLowerCase()
  const isPdf = format === 'pdf'
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif', 'svg'].includes(format)
  const isText = ['txt', 'csv'].includes(format)

  // Load PDF Document via PDF.js
  useEffect(() => {
    setCurrentPage(1)
    setPageInput('1')
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }

    if (!fileUrl || !isPdf) {
      setPdfDoc(null)
      setNumPages(1)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    const loadingTask = pdfjsLib.getDocument({
      url: fileUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/cmaps/',
      cMapPacked: true,
    })

    loadingTask.promise
      .then((loadedDoc) => {
        if (!isMounted) return
        setPdfDoc(loadedDoc)
        setNumPages(loadedDoc.numPages || 1)
        setCurrentPage(1)
        setPageInput('1')
        setLoading(false)
        if (containerRef.current) {
          containerRef.current.scrollTop = 0
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('PDF.js failed to load document:', err)
        setError('Failed to load PDF document')
        setLoading(false)
      })

    return () => {
      isMounted = false
      try {
        loadingTask.destroy()
      } catch {
        // ignore
      }
    }
  }, [fileUrl, isPdf])

  // Sync page input with currentPage
  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  // Zoom handlers
  const handleZoomIn = () => {
    setFitMode('none')
    setZoom((prev) => {
      const next = ZOOM_PRESETS.find((z) => z > prev)
      return next || Math.min(300, prev + 15)
    })
  }

  const handleZoomOut = () => {
    setFitMode('none')
    setZoom((prev) => {
      const prevPresets = [...ZOOM_PRESETS].reverse()
      const next = prevPresets.find((z) => z < prev)
      return next || Math.max(30, prev - 15)
    })
  }

  const handleZoomSelect = (newZoom) => {
    setFitMode('none')
    setZoom(newZoom)
  }

  // Rotate handler
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  // Page navigation handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      scrollToPage(newPage)
    }
  }

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      scrollToPage(newPage)
    }
  }

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value)
  }

  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const val = parseInt(pageInput, 10)
      if (!isNaN(val) && val >= 1 && val <= numPages) {
        setCurrentPage(val)
        scrollToPage(val)
      } else {
        setPageInput(String(currentPage))
      }
    }
  }

  const scrollToPage = (pageNum) => {
    const pageEl = document.getElementById(`pdf-page-${pageNum}`)
    if (pageEl && containerRef.current) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Synchronize active page on scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current || numPages <= 1) return

    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const containerMidY = containerRect.top + containerRect.height / 2

    let activePage = 1
    let closestDist = Infinity

    for (let i = 1; i <= numPages; i++) {
      const pageEl = document.getElementById(`pdf-page-${i}`)
      if (pageEl) {
        const pageRect = pageEl.getBoundingClientRect()
        if (pageRect.top <= containerMidY && pageRect.bottom >= containerMidY) {
          activePage = i
          break
        }
        const pageMidY = (pageRect.top + pageRect.bottom) / 2
        const dist = Math.abs(pageMidY - containerMidY)
        if (dist < closestDist) {
          closestDist = dist
          activePage = i
        }
      }
    }

    if (activePage !== currentPage) {
      setCurrentPage(activePage)
    }
  }, [numPages, currentPage])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Fit to Width
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48
      // Standard PDF page width is around 612pt / 800px at 100%
      const calculatedZoom = Math.min(200, Math.max(40, Math.round((containerWidth / 750) * 100)))
      setZoom(calculatedZoom)
      setFitMode('fit-width')
    }
  }

  // Fit to Page
  const handleFitPage = () => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight - 48
      const calculatedZoom = Math.min(200, Math.max(40, Math.round((containerHeight / 1050) * 100)))
      setZoom(calculatedZoom)
      setFitMode('fit-page')
    }
  }

  // Download document
  const handleDownload = () => {
    if (!fileUrl) return
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName || 'document'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Print document
  const handlePrint = () => {
    if (!fileUrl) return
    const printWindow = window.open(fileUrl, '_blank')
    if (printWindow) {
      printWindow.focus()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  // Copy document link
  const handleCopyLink = () => {
    if (fileUrl) {
      navigator.clipboard.writeText(fileUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Render individual PDF page canvas
  const renderPdfPages = () => {
    if (!pdfDoc) return null

    const pagesToRender = isContinuous
      ? Array.from({ length: numPages }, (_, i) => i + 1)
      : [currentPage]

    return pagesToRender.map((pageNum) => (
      <PdfPageCanvas
        key={`page-${pageNum}-${rotation}-${zoom}`}
        pdfDoc={pdfDoc}
        pageNum={pageNum}
        scale={(zoom / 100) * 1.33}
        rotation={rotation}
      />
    ))
  }

  return (
    <div className="custom-doc-viewer">
      {/* Top Fixed Viewer Toolbar (Dark Enterprise Styling) */}
      <header className="doc-viewer-toolbar" role="toolbar" aria-label="Document Viewer Controls">
        {/* Left Section: Document File Info */}
        <div className="toolbar-section toolbar-left">
          <button className="toolbar-icon-btn" title="Document Menu" aria-label="Document Menu" type="button">
            <Menu size={16} />
          </button>
          <span className="toolbar-doc-title" title={fileName || 'Document'}>
            {fileName ? (fileName.length > 24 ? `${fileName.slice(0, 22)}...` : fileName) : 'Document'}
          </span>
        </div>

        {/* Center Section: Navigation, Zoom, View Modes, Rotate, Tools */}
        <div className="toolbar-section toolbar-center">
          {/* Page Navigation */}
          <div className="toolbar-page-nav">
            <button
              className="toolbar-nav-arrow"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || loading}
              title="Previous Page"
              aria-label="Previous Page"
              type="button"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="toolbar-page-box">
              <span className="toolbar-page-num">{currentPage}</span>
              <span className="toolbar-page-total">/ {numPages}</span>
            </div>
            <button
              className="toolbar-nav-arrow"
              onClick={handleNextPage}
              disabled={currentPage >= numPages || loading}
              title="Next Page"
              aria-label="Next Page"
              type="button"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <span className="toolbar-divider" />

          {/* Zoom Controls */}
          <div className="toolbar-zoom-group">
            <button
              className="toolbar-icon-btn"
              onClick={handleZoomOut}
              title="Zoom Out (-)"
              aria-label="Zoom Out"
              type="button"
            >
              <ZoomOut size={15} />
            </button>
            <div className="toolbar-zoom-dropdown-wrap">
              <select
                className="toolbar-zoom-select"
                value={zoom}
                onChange={(e) => handleZoomSelect(Number(e.target.value))}
                aria-label="Zoom Level"
              >
                {ZOOM_PRESETS.map((z) => (
                  <option key={z} value={z}>
                    {z}%
                  </option>
                ))}
              </select>
            </div>
            <button
              className="toolbar-icon-btn"
              onClick={handleZoomIn}
              title="Zoom In (+)"
              aria-label="Zoom In"
              type="button"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          <span className="toolbar-divider" />

          {/* View Modes */}
          <button
            className={`toolbar-icon-btn ${fitMode === 'fit-page' ? 'is-active' : ''}`}
            onClick={handleFitPage}
            title="Fit to Page"
            aria-label="Fit to Page"
            type="button"
          >
            <Minimize2 size={15} />
          </button>
          <button
            className={`toolbar-icon-btn ${fitMode === 'fit-width' ? 'is-active' : ''}`}
            onClick={handleFitWidth}
            title="Fit to Width"
            aria-label="Fit to Width"
            type="button"
          >
            <Maximize2 size={15} />
          </button>

          {/* Rotate Tool */}
          <button
            className="toolbar-icon-btn"
            onClick={handleRotate}
            title="Rotate Clockwise (90°)"
            aria-label="Rotate Clockwise"
            type="button"
          >
            <RotateCw size={15} />
          </button>

          <span className="toolbar-divider" />

          {/* Annotation / Selection Tools */}
          <button
            className={`toolbar-icon-btn ${activeTool === 'select' ? 'is-active' : ''}`}
            onClick={() => setActiveTool('select')}
            title="Select Text / Cursor"
            aria-label="Select Text"
            type="button"
          >
            <Type size={15} />
          </button>
          <button
            className={`toolbar-icon-btn ${activeTool === 'annotate' ? 'is-active' : ''}`}
            onClick={() => setActiveTool((prev) => (prev === 'annotate' ? 'select' : 'annotate'))}
            title="Draw / Highlight Annotation"
            aria-label="Annotation Tool"
            type="button"
          >
            <PenTool size={15} />
          </button>

          {/* Undo / Redo */}
          <button
            className="toolbar-icon-btn is-disabled"
            disabled
            title="Undo (No actions to undo)"
            aria-label="Undo"
            type="button"
          >
            <Undo2 size={14} />
          </button>
          <button
            className="toolbar-icon-btn is-disabled"
            disabled
            title="Redo (No actions to redo)"
            aria-label="Redo"
            type="button"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {/* Right Section: Document Actions */}
        <div className="toolbar-section toolbar-right">
          <button
            className="toolbar-icon-btn"
            onClick={handleDownload}
            disabled={!fileUrl}
            title="Download Document"
            aria-label="Download Document"
            type="button"
          >
            <Download size={15} />
          </button>
          <button
            className="toolbar-icon-btn"
            onClick={handlePrint}
            disabled={!fileUrl}
            title="Print Document"
            aria-label="Print Document"
            type="button"
          >
            <Printer size={15} />
          </button>

          {/* More Menu */}
          <div className="toolbar-more-wrap">
            <button
              className="toolbar-icon-btn"
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              title="More Options"
              aria-label="More Options"
              type="button"
            >
              <MoreVertical size={15} />
            </button>
            {moreMenuOpen && (
              <div className="toolbar-dropdown-menu" role="menu">
                <button
                  className="dropdown-menu-item"
                  type="button"
                  onClick={() => {
                    setIsContinuous((prev) => !prev)
                    setMoreMenuOpen(false)
                  }}
                >
                  <Layers size={14} />
                  <span>{isContinuous ? 'Single Page View' : 'Continuous Scroll'}</span>
                </button>
                <button
                  className="dropdown-menu-item"
                  type="button"
                  onClick={() => {
                    handleFitWidth()
                    setMoreMenuOpen(false)
                  }}
                >
                  <Maximize2 size={14} />
                  <span>Fit to Width</span>
                </button>
                <button
                  className="dropdown-menu-item"
                  type="button"
                  onClick={() => {
                    handleFitPage()
                    setMoreMenuOpen(false)
                  }}
                >
                  <Minimize2 size={14} />
                  <span>Fit to Page</span>
                </button>
                <button
                  className="dropdown-menu-item"
                  type="button"
                  onClick={() => {
                    setZoom(100)
                    setRotation(0)
                    setFitMode('none')
                    setMoreMenuOpen(false)
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Reset View (100%)</span>
                </button>
                <button
                  className="dropdown-menu-item"
                  type="button"
                  onClick={() => {
                    if (fileUrl) window.open(fileUrl, '_blank')
                    setMoreMenuOpen(false)
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open in New Tab</span>
                </button>
                <button
                  className="dropdown-menu-item"
                  type="button"
                  onClick={() => {
                    handleCopyLink()
                    setMoreMenuOpen(false)
                  }}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Document Link'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable Document Rendering Canvas */}
      <div
        className="doc-viewer-canvas"
        ref={containerRef}
        onScroll={handleScroll}
        onClick={() => setMoreMenuOpen(false)}
        role="region"
        aria-label="Document Content"
      >
        {/* Loading Indicator */}
        {loading && (
          <div className="doc-viewer-state-msg">
            <div className="doc-loading-spinner" />
            <p>Loading document pages...</p>
          </div>
        )}

        {/* Error State with fallback */}
        {!loading && error && (
          <div className="doc-viewer-state-msg">
            <p className="doc-error-title">Unable to render document in canvas</p>
            <p className="doc-error-sub">Falling back to embedded viewer...</p>
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              title={fileName || 'PDF Document'}
              className="fallback-pdf-iframe"
            />
          </div>
        )}

        {/* PDF Document Render via Canvas */}
        {!loading && !error && isPdf && pdfDoc && (
          <div
            className="doc-pages-container"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
            }}
          >
            {renderPdfPages()}
          </div>
        )}

        {/* Image Files Render */}
        {!loading && !error && isImage && fileUrl && (
          <div className="doc-image-page-wrap">
            <div
              className="doc-page-card"
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease',
              }}
            >
              <img src={fileUrl} alt={fileName || 'Document'} className="doc-rendered-image" />
            </div>
          </div>
        )}

        {/* Text & CSV Files Render */}
        {!loading && !error && isText && (
          <div className="doc-text-page-wrap">
            <div
              className="doc-page-card doc-text-sheet"
              style={{
                fontSize: `${13 * (zoom / 100)}px`,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <pre className="doc-text-content">{extractedText || '(Empty text document)'}</pre>
            </div>
          </div>
        )}

        {/* Office / Other Document Types */}
        {!loading && !error && !isPdf && !isImage && !isText && fileUrl && (
          <div className="doc-office-wrap">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              title={fileName || 'Document'}
              className="fallback-pdf-iframe"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Subcomponent: Individual PDF Page Canvas
function PdfPageCanvas({ pdfDoc, pageNum, scale, rotation }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const [rendered, setRendered] = useState(false)
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 })

  useEffect(() => {
    let isCancelled = false

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum)
        if (isCancelled) return

        const viewport = page.getViewport({ scale: scale || 1.2 })
        setPageSize({ width: viewport.width, height: viewport.height })

        const canvas = canvasRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        // Cancel previous ongoing render task if any
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {
            // ignore
          }
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        const renderTask = page.render(renderContext)
        renderTaskRef.current = renderTask

        await renderTask.promise
        if (!isCancelled) {
          setRendered(true)
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering PDF page ${pageNum}:`, err)
        }
      }
    }

    renderPage()

    return () => {
      isCancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // ignore
        }
      }
    }
  }, [pdfDoc, pageNum, scale])

  return (
    <div id={`pdf-page-${pageNum}`} className="doc-page-card">
      <canvas ref={canvasRef} className="doc-page-canvas" />
    </div>
  )
}
