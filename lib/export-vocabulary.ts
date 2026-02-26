import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export interface VocabularyItem {
  id: string
  luxembourgish_word: string
  english_translation: string
  notes: string | null
  created_at: string
}

/**
 * Export vocabulary to CSV
 */
export function exportToCSV(vocabulary: VocabularyItem[]): void {
  // Create CSV header
  const headers = ["Luxembourgish", "English Translation", "Notes", "Date Added"]
  
  // Create CSV rows
  const rows = vocabulary.map((item) => {
    const lux = escapeCSV(item.luxembourgish_word)
    const eng = escapeCSV(item.english_translation)
    const notes = escapeCSV(item.notes || "")
    const date = new Date(item.created_at).toLocaleDateString()
    return [lux, eng, notes, date]
  })
  
  // Combine header and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.join(","))
    .join("\n")
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  
  link.setAttribute("href", url)
  link.setAttribute("download", `vocabulary-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export vocabulary to PDF
 */
export function exportToPDF(vocabulary: VocabularyItem[]): void {
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(18)
  doc.text("My Luxembourgish Vocabulary", 14, 20)
  
  // Add date
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Exported on ${new Date().toLocaleDateString()}`, 14, 28)
  
  // Prepare table data
  const tableData = vocabulary.map((item) => [
    item.luxembourgish_word,
    item.english_translation,
    item.notes || "",
    new Date(item.created_at).toLocaleDateString(),
  ])
  
  // Add table
  autoTable(doc, {
    head: [["Luxembourgish", "English Translation", "Notes", "Date Added"]],
    body: tableData,
    startY: 35,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Light gray
    },
    columnStyles: {
      0: { cellWidth: 50 }, // Luxembourgish
      1: { cellWidth: 50 }, // English
      2: { cellWidth: 60 }, // Notes
      3: { cellWidth: 30 }, // Date
    },
    margin: { top: 35 },
  })
  
  // Save PDF
  doc.save(`vocabulary-${new Date().toISOString().split("T")[0]}.pdf`)
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(value: string): string {
  if (!value) return ""
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  
  return value
}

