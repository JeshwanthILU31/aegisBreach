const fileNames = [
  'ORION_Reportable_Data_001.pdf',
  'ORION_Reportable_Data_002.pdf',
  'Employee_Records_Release_003.docx',
  'Customer_Notification_004.pdf',
  'Incident_Review_Notes_005.xlsx',
  'Forensic_Extraction_Log_006.txt',
  'Breach_Assessment_007.pdf',
  'Supporting_Exhibit_008.docx',
]

const reviewers = ['Review User', 'Training User', 'Case Reviewer', '']
const extractors = ['System Extractor', 'Training User', 'Data Services', '']

export const mockDocuments = Array.from({ length: 64 }, (_, index) => {
  const number = String(index + 1).padStart(5, '0')
  const reviewed = index % 4 !== 3
  return {
    id: `doc-${number}`,
    batchId: `batch-${String((index % 48) + 1).padStart(4, '0')}`,
    controlNumber: `OR-${String(600001 + index)}`,
    reportableData: index % 3 === 0 ? 'Yes' : index % 3 === 1 ? 'No' : 'Pending',
    flrReviewedBy: reviewers[index % reviewers.length],
    flrReviewedOn: reviewed ? `09/${String((index % 27) + 1).padStart(2, '0')}/2026` : '',
    extractionStatus: index % 5 === 0 ? 'Pending' : 'Complete',
    extractedBy: extractors[index % extractors.length],
    extractedOn: index % 5 === 0 ? '' : `09/${String((index % 27) + 1).padStart(2, '0')}/2026`,
    fileName: fileNames[index % fileNames.length],
    fileSize: `${(index % 9) + 1}.${index % 10} MB`,
  }
})
