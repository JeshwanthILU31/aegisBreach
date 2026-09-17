import 'dotenv/config'
import mongoose from 'mongoose'
import Project from '../models/Project.js'
import Batch from '../models/Batch.js'
import Document from '../models/Document.js'
import Coding from '../models/Coding.js'

export async function seedDemoData() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing. Cannot seed database.')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected for seeding.')

  // 1. Safe, idempotent project upsert
  const project = await Project.findOneAndUpdate(
    { slug: 'project-orchid-6-7' },
    {
      $setOnInsert: {
        name: 'Project Orchid (6-7)',
        slug: 'project-orchid-6-7',
        matterName: 'Orchid',
        matterNumber: 'MTR-0067',
        clientNumber: 'CL-1042',
        description: 'Project Orchid review workspace',
        status: 'Active',
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )

  console.log(`Target project ensured: ${project.name} (${project._id})`)

  // 2. Realistic Demo Batches (3 Available + 2 Taken by Simulated Employees)
  const demoBatches = [
    // Batch 1 - Available for Reviewer
    {
      name: 'Monday Batch1_00017',
      batchSet: 'Monday Batch1',
      batchUnit: 'Alternate Workflow 6+ Entries',
      status: 'Available',
      isLocked: false,
      assignedToName: '',
      acquiredAt: null,
      reviewed: 0,
      batchSize: 3,
    },
    // Batch 2 - Available for Reviewer
    {
      name: 'Monday Batch1_00015',
      batchSet: 'Monday Batch1',
      batchUnit: 'Alternate Workflow 6+ Entries',
      status: 'Available',
      isLocked: false,
      assignedToName: '',
      acquiredAt: null,
      reviewed: 0,
      batchSize: 3,
    },
    // Batch 3 - Available for Reviewer
    {
      name: 'Monday Batch1_00012',
      batchSet: 'Monday Batch1',
      batchUnit: 'Alternate Workflow 6+ Entries',
      status: 'Available',
      isLocked: false,
      assignedToName: '',
      acquiredAt: null,
      reviewed: 0,
      batchSize: 3,
    },
    // Simulated Employee A
    {
      name: 'Monday Batch1_00014',
      batchSet: 'Monday Batch1',
      batchUnit: 'Alternate Workflow 6+ Entries',
      status: 'In Progress',
      isLocked: true,
      assignedToName: 'Employee A (Gupta, Anjali)',
      acquiredAt: new Date(Date.now() - 3600000),
      reviewed: 8,
      batchSize: 50,
    },
    // Simulated Employee B
    {
      name: 'Monday Batch1_00016',
      batchSet: 'Monday Batch1',
      batchUnit: 'Alternate Workflow 6+ Entries',
      status: 'In Progress',
      isLocked: true,
      assignedToName: 'Employee B (Saini, Suresh)',
      acquiredAt: new Date(Date.now() - 7200000),
      reviewed: 18,
      batchSize: 50,
    },
  ]

  const batchMap = new Map()

  for (const demo of demoBatches) {
    const updated = await Batch.findOneAndUpdate(
      { projectId: project._id, name: demo.name },
      {
        $set: {
          ...demo,
          projectId: project._id,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )
    batchMap.set(demo.name, updated)
  }

  console.log(`Batches: ${demoBatches.length} upserted/configured.`)

  // 3. Demo Documents linked to batches
  const demoDocuments = [
    // Batch 1 Documents (OR-600001, OR-600002, OR-600003)
    {
      batchName: 'Monday Batch1_00017',
      controlNumber: 'OR-600001',
      fileName: 'ORION_Reportable_Data_001.pdf',
      fileSize: '1.4 MB',
      folder: 'Set 7',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },
    {
      batchName: 'Monday Batch1_00017',
      controlNumber: 'OR-600002',
      fileName: 'ORION_Reportable_Data_002.pdf',
      fileSize: '2.1 MB',
      folder: 'Set 7',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },
    {
      batchName: 'Monday Batch1_00017',
      controlNumber: 'OR-600003',
      fileName: 'Employee_Records_Release_003.docx',
      fileSize: '0.8 MB',
      folder: 'Set 7',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },

    // Batch 2 Documents (OR-600004, OR-600005, OR-600006)
    {
      batchName: 'Monday Batch1_00015',
      controlNumber: 'OR-600004',
      fileName: 'Forensic_Extraction_Log_004.txt',
      fileSize: '0.5 MB',
      folder: 'Set 6',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },
    {
      batchName: 'Monday Batch1_00015',
      controlNumber: 'OR-600005',
      fileName: 'Breach_Assessment_005.pdf',
      fileSize: '4.5 MB',
      folder: 'Set 6',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },
    {
      batchName: 'Monday Batch1_00015',
      controlNumber: 'OR-600006',
      fileName: 'Network_Security_Report_006.docx',
      fileSize: '3.4 MB',
      folder: 'Set 6',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },

    // Batch 3 Documents (OR-600007, OR-600008, OR-600009)
    {
      batchName: 'Monday Batch1_00012',
      controlNumber: 'OR-600007',
      fileName: 'Executive_Summary_007.pdf',
      fileSize: '1.9 MB',
      folder: 'Set 6',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },
    {
      batchName: 'Monday Batch1_00012',
      controlNumber: 'OR-600008',
      fileName: 'Vendor_Compliance_Audit_008.docx',
      fileSize: '2.3 MB',
      folder: 'Set 6',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },
    {
      batchName: 'Monday Batch1_00012',
      controlNumber: 'OR-600009',
      fileName: 'Incident_Response_Plan_009.pdf',
      fileSize: '3.8 MB',
      folder: 'Set 6',
      reportableData: 'Pending',
      flrReviewedBy: '',
      flrReviewedOn: '',
      extractionStatus: 'Pending',
      extractedBy: '',
      extractedOn: '',
    },

    // Simulated Employee A Documents (OR-600010, OR-600011)
    {
      batchName: 'Monday Batch1_00014',
      controlNumber: 'OR-600010',
      fileName: 'Customer_Notification_010.pdf',
      fileSize: '3.2 MB',
      folder: 'Set 6',
      reportableData: 'Yes',
      flrReviewedBy: 'Employee A (Gupta, Anjali)',
      flrReviewedOn: '09/16/2026',
      extractionStatus: 'Complete',
      extractedBy: 'System Extractor',
      extractedOn: '09/16/2026',
    },
    {
      batchName: 'Monday Batch1_00014',
      controlNumber: 'OR-600011',
      fileName: 'Incident_Review_Notes_011.xlsx',
      fileSize: '1.1 MB',
      folder: 'Set 6',
      reportableData: 'No',
      flrReviewedBy: 'Employee A (Gupta, Anjali)',
      flrReviewedOn: '09/16/2026',
      extractionStatus: 'Complete',
      extractedBy: 'Data Services',
      extractedOn: '09/16/2026',
    },

    // Simulated Employee B Documents (OR-600012, OR-600013)
    {
      batchName: 'Monday Batch1_00016',
      controlNumber: 'OR-600012',
      fileName: 'Supporting_Exhibit_012.docx',
      fileSize: '2.8 MB',
      folder: 'Set 7',
      reportableData: 'No',
      flrReviewedBy: 'Employee B (Saini, Suresh)',
      flrReviewedOn: '09/16/2026',
      extractionStatus: 'Complete',
      extractedBy: 'System Extractor',
      extractedOn: '09/16/2026',
    },
    {
      batchName: 'Monday Batch1_00016',
      controlNumber: 'OR-600013',
      fileName: 'ORION_Financial_Audit_013.xlsx',
      fileSize: '5.1 MB',
      folder: 'Set 7',
      reportableData: 'Yes',
      flrReviewedBy: 'Employee B (Saini, Suresh)',
      flrReviewedOn: '09/16/2026',
      extractionStatus: 'Complete',
      extractedBy: 'Data Services',
      extractedOn: '09/16/2026',
    },
  ]

  for (const doc of demoDocuments) {
    const batch = batchMap.get(doc.batchName)
    if (!batch) continue

    await Document.findOneAndUpdate(
      {
        projectId: project._id,
        controlNumber: doc.controlNumber,
      },
      {
        $set: {
          projectId: project._id,
          batchId: batch._id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          folder: doc.folder,
          reportableData: doc.reportableData,
          flrReviewedBy: doc.flrReviewedBy,
          flrReviewedOn: doc.flrReviewedOn,
          extractionStatus: doc.extractionStatus,
          extractedBy: doc.extractedBy,
          extractedOn: doc.extractedOn,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )
  }

  // Clear any leftover coding records for clean start
  await Coding.deleteMany({ projectId: project._id.toString() })

  console.log(`Documents: ${demoDocuments.length} upserted/configured.`)
  console.log('Seeding complete.')
  await mongoose.disconnect()
}

import { fileURLToPath } from 'url'

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding error:', error)
      process.exit(1)
    })
}
