import mongoose from 'mongoose'
import Coding from '../models/Coding.js'
import Document from '../models/Document.js'
import Project from '../models/Project.js'
import Batch from '../models/Batch.js'

/**
 * GET /api/admin/person-tracker
 * Admin-only cross-project Person Tracker aggregation & search
 */
export async function getAdminPersonTracker(req, res) {
  try {
    const { projectId, batchId, documentId, reviewer, search } = req.query

    // 1. Fetch all coding documents that contain person entries
    const codingDocs = await Coding.find({
      'persons.0': { $exists: true },
    }).lean()

    if (!codingDocs || codingDocs.length === 0) {
      return res.json({
        items: [],
        total: 0,
      })
    }

    // 2. Fetch all Projects, Batches, and Documents to build lookup maps
    const [allProjects, allBatches, allDocuments] = await Promise.all([
      Project.find().lean(),
      Batch.find().lean(),
      Document.find().lean(),
    ])

    // Lookup map: Project by _id string and slug
    const projectMap = new Map()
    for (const proj of allProjects) {
      projectMap.set(proj._id.toString(), proj)
      if (proj.slug) {
        projectMap.set(proj.slug, proj)
      }
    }

    // Lookup map: Batch by _id string
    const batchMap = new Map()
    for (const b of allBatches) {
      batchMap.set(b._id.toString(), b)
    }

    // Lookup map: Document by controlNumber (and by _id)
    const docByControlMap = new Map()
    const docByIdMap = new Map()
    for (const doc of allDocuments) {
      docByIdMap.set(doc._id.toString(), doc)
      if (doc.controlNumber) {
        const key = `${doc.projectId?.toString() || ''}__${doc.controlNumber}`
        docByControlMap.set(key, doc)
        // Also fallback key by controlNumber alone
        if (!docByControlMap.has(doc.controlNumber)) {
          docByControlMap.set(doc.controlNumber, doc)
        }
      }
    }

    const items = []

    // 3. Process each person entry across all coding records
    for (const coding of codingDocs) {
      // Resolve project
      let project = projectMap.get(coding.projectId)
      if (!project && mongoose.Types.ObjectId.isValid(coding.projectId)) {
        project = projectMap.get(coding.projectId.toString())
      }

      // Resolve document
      const docLookupKey = `${project?._id?.toString() || coding.projectId}__${coding.documentId}`
      let doc = docByControlMap.get(docLookupKey) || docByControlMap.get(coding.documentId) || docByIdMap.get(coding.documentId)

      // Resolve batch
      let batch = doc?.batchId ? batchMap.get(doc.batchId.toString()) : null

      const persons = Array.isArray(coding.persons) ? coding.persons : []

      for (const person of persons) {
        if (!person) continue

        const record = {
          person: {
            _id: person._id || '',
            itemNumber: person.itemNumber || '',
            personDocLink: person.personDocLink || '',
            firstName: person.firstName || '',
            middleName: person.middleName || '',
            lastName: person.lastName || '',
            suffix: person.suffix || '',
            address: person.address || '',
            city: person.city || '',
            state: person.state || '',
            zip: person.zip || '',
            internationalAddress: person.internationalAddress || '',
            country: person.country || '',
            dob: person.dob || '',
            ssn: person.ssn || '',
            tin: person.tin || '',
            financialAccountNumber: person.financialAccountNumber || '',
            financialRoutingNumberInternal: person.financialRoutingNumberInternal || '',
            financialRoutingNumber: person.financialRoutingNumber || '',
            financialInstitutionName: person.financialInstitutionName || '',
            loginPlatform: person.loginPlatform || '',
            paymentCardNumber: person.paymentCardNumber || '',
            paymentCardExpirationDate: person.paymentCardExpirationDate || '',
            passportNumber: person.passportNumber || '',
            passportIssuingCountry: person.passportIssuingCountry || '',
            passportExpirationDate: person.passportExpirationDate || '',
            militaryIdNumber: person.militaryIdNumber || '',
            driversLicenseNumber: person.driversLicenseNumber || '',
            dlState: person.dlState || '',
            otherGovernmentIssuedIdNumber: person.otherGovernmentIssuedIdNumber || '',
            otherGovIdNumber: person.otherGovIdNumber || '',
            otherGovernmentIssuedType: person.otherGovernmentIssuedType || '',
            otherGovIdType: person.otherGovIdType || '',
            otherGovernmentIssuedIdCountry: person.otherGovernmentIssuedIdCountry || '',
            otherGovIdCountry: person.otherGovIdCountry || '',
            studentIdNumber: person.studentIdNumber || '',
            alienRegistrationNumber: person.alienRegistrationNumber || '',
            tribalIdentificationNumber: person.tribalIdentificationNumber || '',
            tribalIdNumber: person.tribalIdNumber || '',
            stateIdentificationCardNumber: person.stateIdentificationCardNumber || '',
            stateIdCardNumber: person.stateIdCardNumber || '',
            patientAccountNumber: person.patientAccountNumber || '',
            medicalRecordNumber: person.medicalRecordNumber || '',
            medicaidMedicareNumber: person.medicaidMedicareNumber || '',
            healthInsurancePolicyNumber: person.healthInsurancePolicyNumber || '',
            dateOfDeath: person.dateOfDeath || '',
            dataOwner: person.dataOwner || '',
            role: person.role || '',
            hospital: person.hospital || '',
          },
          document: {
            id: doc?._id?.toString() || '',
            controlNumber: doc?.controlNumber || coding.documentId || '',
            fileName: doc?.fileName || '',
          },
          batch: {
            id: batch?._id?.toString() || '',
            name: batch?.name || '',
          },
          project: {
            id: project?._id?.toString() || coding.projectId || '',
            name: project?.name || coding.projectId || '',
          },
          audit: {
            createdBy: person.createdBy || coding.flrReviewedBy || 'Unknown',
            createdAt: person.createdAt || coding.createdAt || null,
            updatedBy: person.updatedBy || person.createdBy || coding.flrReviewedBy || 'Unknown',
            updatedAt: person.updatedAt || coding.updatedAt || null,
          },
        }

        // Apply AND Filters

        // 1. Filter by projectId
        if (projectId) {
          const matchProjectId =
            record.project.id === projectId ||
            (project && project.slug === projectId) ||
            coding.projectId === projectId ||
            (project && project.name.toLowerCase() === projectId.toLowerCase())
          if (!matchProjectId) continue
        }

        // 2. Filter by batchId
        if (batchId) {
          const matchBatchId =
            record.batch.id === batchId ||
            (batch && batch.name.toLowerCase() === batchId.toLowerCase())
          if (!matchBatchId) continue
        }

        // 3. Filter by documentId
        if (documentId) {
          const matchDocumentId =
            record.document.id === documentId ||
            record.document.controlNumber === documentId ||
            coding.documentId === documentId
          if (!matchDocumentId) continue
        }

        // 4. Filter by reviewer
        if (reviewer) {
          const revQuery = reviewer.trim().toLowerCase()
          const createdByMatch = record.audit.createdBy?.toLowerCase().includes(revQuery)
          const updatedByMatch = record.audit.updatedBy?.toLowerCase().includes(revQuery)
          if (!createdByMatch && !updatedByMatch) continue
        }

        // 5. Global Search across person, document, batch, project, and audit fields
        if (search) {
          const s = search.trim().toLowerCase()
          const searchableFields = [
            record.person.firstName,
            record.person.lastName,
            record.person.middleName,
            record.person.personDocLink,
            record.person.itemNumber,
            record.person.address,
            record.person.city,
            record.person.state,
            record.person.zip,
            record.person.ssn,
            record.person.tin,
            record.person.dataOwner,
            record.person.role,
            record.person.financialAccountNumber,
            record.person.passportNumber,
            record.person.driversLicenseNumber,
            record.person.medicalRecordNumber,
            record.person.loginPlatform,
            record.document.controlNumber,
            record.document.fileName,
            record.project.name,
            record.batch.name,
            record.audit.createdBy,
            record.audit.updatedBy,
          ]

          const matchSearch = searchableFields.some(
            (val) => typeof val === 'string' && val.toLowerCase().includes(s)
          )
          if (!matchSearch) continue
        }

        items.push(record)
      }
    }

    return res.json({
      items,
      total: items.length,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
