import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const defaultCoding = {
  alDesignation: 'Relevant',
  flrComplete: 'Yes',
  reportableDataFound: 'Alternate Workflow 6+ Entries',
  extractionStatus: 'Completed',
  alternateWorkflowEstimate: '6 - 25 Entries',
  alternateWorkflowComplete: 'Yes',
  awfExtractionCompleted: 'Yes',
  extractedOutsideRelativity: '',
  txtStatus: '',
  entriesCompleted: '',
  reviewerNotes: '',
  familyGroup: 'None',
  persons: [],
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'Other',
]

const emptyPerson = {
  itemNumber: '',
  personDocLink: '',
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  address: '',
  city: '',
  internationalAddress: '',
  country: '',
  tin: '',
  financialAccountNumber: '',
  financialRoutingNumberInternal: '',
  financialRoutingNumber: '',
  paymentCardNumber: '',
  passportNumber: '',
  militaryIdNumber: '',
  driversLicenseNumber: '',
  otherGovernmentIssuedIdNumber: '',
  otherGovIdNumber: '',
  otherGovernmentIssuedType: '',
  otherGovIdType: '',
  alienRegistrationNumber: '',
  tribalIdentificationNumber: '',
  tribalIdNumber: '',
  patientAccountNumber: '',
  medicaidMedicareNumber: '',
  dateOfDeath: '',
  state: '',
  zip: '',
  dob: '',
  ssn: '',
  financialInstitutionName: '',
  loginPlatform: '',
  paymentCardExpirationDate: '',
  passportIssuingCountry: '',
  passportExpirationDate: '',
  dlState: '',
  otherGovernmentIssuedIdCountry: '',
  otherGovIdCountry: '',
  studentIdNumber: '',
  stateIdentificationCardNumber: '',
  stateIdCardNumber: '',
  medicalRecordNumber: '',
  healthInsurancePolicyNumber: '',
  dataOwner: '',
  role: '',
  hospital: '',
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="coding-panel-section">
      <button
        className="coding-panel-section-title"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{open ? '-' : '+'}</span>
        <strong>{title}</strong>
      </button>
      {open && <div className="coding-panel-section-body">{children}</div>}
    </section>
  )
}

function CodingField({ label, children }) {
  return (
    <label className="coding-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function PersonTrackerModal({
  draft,
  updateDraft,
  onSave,
  onClose,
  position,
  isDragging,
  handleMouseDown,
  isSaving = false,
  error = '',
}) {
  return (
    <div className="person-tracker-overlay-floating">
      <div
        className="person-tracker-entry-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-tracker-title"
        onMouseDown={handleMouseDown}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* Top Header Bar matching Relativity layout */}
        <div
          className="person-tracker-topbar"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        >
          <div className="person-tracker-topbar-left">
            <span className="person-tracker-layout-badge">
              Person Tracker Layout ▼
            </span>
          </div>
          <div className="person-tracker-topbar-actions">
            <button
              className="person-tracker-save-btn"
              type="button"
              disabled={isSaving}
              onClick={onSave}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              className="person-tracker-cancel-btn"
              type="button"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="person-tracker-close-btn"
              type="button"
              onClick={onClose}
              aria-label="Close person tracker form"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Optional Error Banner */}
        {error && (
          <div
            className="person-tracker-modal-error"
            style={{
              padding: '6px 14px',
              backgroundColor: '#fde8e8',
              color: '#9b1c1c',
              fontSize: '12px',
              fontWeight: 500,
              borderBottom: '1px solid #f8b4b4',
            }}
          >
            {error}
          </div>
        )}

        {/* Subheader: Entry title & PersonDocLink */}
        <div className="person-tracker-subheader">
          <span className="person-tracker-entry-title" id="person-tracker-title">
            Person Tracker Entry
          </span>
          <div className="person-tracker-doclink-display">
            <span>PersonDocLink</span>
            <input
              className="person-tracker-doclink-input"
              value={draft.personDocLink || ''}
              onChange={(e) => updateDraft('personDocLink', e.target.value)}
              placeholder="CNTRL_..."
            />
          </div>
        </div>

        {/* 2-Column Form Body */}
        <div className="person-tracker-grid-body">
          {/* LEFT COLUMN */}
          <div className="person-tracker-column">
            <div className="person-tracker-row">
              <label className="person-tracker-label">Item Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.itemNumber || ''}
                  onChange={(e) => updateDraft('itemNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">
                First Name <span className="req-star">*</span>
              </label>
              <div className="person-tracker-control">
                <input
                  autoFocus
                  value={draft.firstName || ''}
                  onChange={(e) => updateDraft('firstName', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Middle Name</label>
              <div className="person-tracker-control">
                <input
                  value={draft.middleName || ''}
                  onChange={(e) => updateDraft('middleName', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">
                Last Name <span className="req-star">*</span>
              </label>
              <div className="person-tracker-control">
                <input
                  value={draft.lastName || ''}
                  onChange={(e) => updateDraft('lastName', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Suffix</label>
              <div className="person-tracker-control">
                <input
                  value={draft.suffix || ''}
                  onChange={(e) => updateDraft('suffix', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Address</label>
              <div className="person-tracker-control">
                <input
                  value={draft.address || ''}
                  onChange={(e) => updateDraft('address', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">City</label>
              <div className="person-tracker-control">
                <input
                  value={draft.city || ''}
                  onChange={(e) => updateDraft('city', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">International Address</label>
              <div className="person-tracker-control">
                <input
                  value={draft.internationalAddress || ''}
                  onChange={(e) => updateDraft('internationalAddress', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Country</label>
              <div className="person-tracker-control">
                <input
                  value={draft.country || ''}
                  onChange={(e) => updateDraft('country', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">TIN</label>
              <div className="person-tracker-control">
                <input
                  value={draft.tin || ''}
                  onChange={(e) => updateDraft('tin', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Financial Account Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.financialAccountNumber || ''}
                  onChange={(e) => updateDraft('financialAccountNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Financial Routing Number - Internal</label>
              <div className="person-tracker-control">
                <input
                  value={draft.financialRoutingNumberInternal || draft.financialRoutingNumber || ''}
                  onChange={(e) => {
                    updateDraft('financialRoutingNumberInternal', e.target.value)
                    updateDraft('financialRoutingNumber', e.target.value)
                  }}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Payment Card Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.paymentCardNumber || ''}
                  onChange={(e) => updateDraft('paymentCardNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Passport Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.passportNumber || ''}
                  onChange={(e) => updateDraft('passportNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Military ID Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.militaryIdNumber || ''}
                  onChange={(e) => updateDraft('militaryIdNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Driver's License Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.driversLicenseNumber || ''}
                  onChange={(e) => updateDraft('driversLicenseNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Other Government Issued ID Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.otherGovernmentIssuedIdNumber || draft.otherGovIdNumber || ''}
                  onChange={(e) => {
                    updateDraft('otherGovernmentIssuedIdNumber', e.target.value)
                    updateDraft('otherGovIdNumber', e.target.value)
                  }}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Other Government Issued Type</label>
              <div className="person-tracker-control">
                <input
                  value={draft.otherGovernmentIssuedType || draft.otherGovIdType || ''}
                  onChange={(e) => {
                    updateDraft('otherGovernmentIssuedType', e.target.value)
                    updateDraft('otherGovIdType', e.target.value)
                  }}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Alien Registration Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.alienRegistrationNumber || ''}
                  onChange={(e) => updateDraft('alienRegistrationNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Tribal Identification Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.tribalIdentificationNumber || draft.tribalIdNumber || ''}
                  onChange={(e) => {
                    updateDraft('tribalIdentificationNumber', e.target.value)
                    updateDraft('tribalIdNumber', e.target.value)
                  }}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Patient Account Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.patientAccountNumber || ''}
                  onChange={(e) => updateDraft('patientAccountNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Medicaid / Medicare Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.medicaidMedicareNumber || ''}
                  onChange={(e) => updateDraft('medicaidMedicareNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Date of Death</label>
              <div className="person-tracker-control">
                <input
                  placeholder="mm/dd/yyyy"
                  value={draft.dateOfDeath || ''}
                  onChange={(e) => updateDraft('dateOfDeath', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="person-tracker-column">
            <div className="person-tracker-row">
              <label className="person-tracker-label">State</label>
              <div className="person-tracker-control">
                <input
                  value={draft.state || ''}
                  onChange={(e) => updateDraft('state', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">ZIP</label>
              <div className="person-tracker-control">
                <input
                  value={draft.zip || ''}
                  onChange={(e) => updateDraft('zip', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">DOB</label>
              <div className="person-tracker-control">
                <input
                  placeholder="mm/dd/yyyy"
                  value={draft.dob || ''}
                  onChange={(e) => updateDraft('dob', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">SSN</label>
              <div className="person-tracker-control">
                <input
                  value={draft.ssn || ''}
                  onChange={(e) => updateDraft('ssn', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Financial Institution Name</label>
              <div className="person-tracker-control">
                <input
                  value={draft.financialInstitutionName || ''}
                  onChange={(e) => updateDraft('financialInstitutionName', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Login Platform</label>
              <div className="person-tracker-control">
                <input
                  value={draft.loginPlatform || ''}
                  onChange={(e) => updateDraft('loginPlatform', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Payment Card Expiration Date</label>
              <div className="person-tracker-control">
                <input
                  value={draft.paymentCardExpirationDate || ''}
                  onChange={(e) => updateDraft('paymentCardExpirationDate', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Passport Issuing Country</label>
              <div className="person-tracker-control">
                <input
                  value={draft.passportIssuingCountry || ''}
                  onChange={(e) => updateDraft('passportIssuingCountry', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Passport Expiration Date</label>
              <div className="person-tracker-control">
                <input
                  placeholder="mm/dd/yyyy"
                  value={draft.passportExpirationDate || ''}
                  onChange={(e) => updateDraft('passportExpirationDate', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">DL State</label>
              <div className="person-tracker-control">
                <input
                  value={draft.dlState || ''}
                  onChange={(e) => updateDraft('dlState', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Other Government Issued ID Country</label>
              <div className="person-tracker-control">
                <input
                  value={draft.otherGovernmentIssuedIdCountry || draft.otherGovIdCountry || ''}
                  onChange={(e) => {
                    updateDraft('otherGovernmentIssuedIdCountry', e.target.value)
                    updateDraft('otherGovIdCountry', e.target.value)
                  }}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Student ID Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.studentIdNumber || ''}
                  onChange={(e) => updateDraft('studentIdNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">State Identification Card Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.stateIdentificationCardNumber || draft.stateIdCardNumber || ''}
                  onChange={(e) => {
                    updateDraft('stateIdentificationCardNumber', e.target.value)
                    updateDraft('stateIdCardNumber', e.target.value)
                  }}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Medical Record Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.medicalRecordNumber || ''}
                  onChange={(e) => updateDraft('medicalRecordNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">Health Insurance Policy Number</label>
              <div className="person-tracker-control">
                <input
                  value={draft.healthInsurancePolicyNumber || ''}
                  onChange={(e) => updateDraft('healthInsurancePolicyNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="person-tracker-row">
              <label className="person-tracker-label">
                Data Owner <span className="req-star">*</span>
              </label>
              <div className="person-tracker-control">
                <input
                  value={draft.dataOwner || draft.role || ''}
                  onChange={(e) => {
                    updateDraft('dataOwner', e.target.value)
                    updateDraft('role', e.target.value)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PersonTracker({
  persons,
  setPersons,
  onSavePerson,
  onRemovePerson,
  readOnly,
  currentDocControlNumber,
}) {
  const [draft, setDraft] = useState(emptyPerson)
  const [editingPersonId, setEditingPersonId] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  const handleMouseDown = (e) => {
    if (
      e.target.closest('input, textarea, select, button, a, [role="button"]') ||
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT' ||
      e.target.tagName === 'A'
    ) {
      return
    }
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const updateDraft = (key, value) => {
    setDraft((current) => {
      const updated = { ...current, [key]: value }
      if (editingPersonId && setPersons) {
        setPersons((prevList) =>
          prevList.map((p) =>
            (p._id && String(p._id) === String(editingPersonId)) ? { ...p, [key]: value } : p
          )
        )
      }
      return updated
    })
    if (modalError) setModalError('')
  }

  const addPerson = async () => {
    if (!draft.firstName && !draft.lastName && !draft.personDocLink && !draft.dataOwner) {
      setModalError('Please enter at least a First Name, Last Name, or PersonDocLink.')
      return
    }
    if (readOnly) {
      setModalError('Cannot save: document is read-only.')
      return
    }

    setIsSaving(true)
    setModalError('')
    try {
      if (onSavePerson) {
        await onSavePerson(draft, editingPersonId)
      } else if (setPersons) {
        setPersons((current) => {
          if (editingPersonId) {
            const idx = current.findIndex((p) => p._id && String(p._id) === String(editingPersonId))
            if (idx !== -1) {
              const copy = [...current]
              copy[idx] = { ...copy[idx], ...draft, _id: editingPersonId }
              return copy
            }
          }
          return [...current, { ...draft, _id: draft._id || `p_${Date.now()}` }]
        })
      }
      setDraft(emptyPerson)
      setEditingPersonId(null)
      setShowForm(false)
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || 'Failed to save person to database.')
    } finally {
      setIsSaving(false)
    }
  }

  const removePerson = async () => {
    if (selectedIndex === null || readOnly) return
    const updated = persons.filter((_, index) => index !== selectedIndex)
    if (onRemovePerson) {
      try {
        await onRemovePerson(updated)
        setSelectedIndex(null)
        setEditingPersonId(null)
        setDraft(emptyPerson)
      } catch (err) {
        console.error('Failed to unlink person:', err)
      }
    } else if (setPersons) {
      setPersons(updated)
      setSelectedIndex(null)
      setEditingPersonId(null)
      setDraft(emptyPerson)
    }
  }

  const handleSelectPerson = (index) => {
    setSelectedIndex(index)
    const person = persons[index]
    if (person) {
      setDraft({ ...emptyPerson, ...person })
      setEditingPersonId(person._id || null)
    }
  }

  const handleOpenEditPerson = (index) => {
    setSelectedIndex(index)
    const person = persons[index]
    if (person) {
      setDraft({ ...emptyPerson, ...person })
      setEditingPersonId(person._id || null)
      setModalError('')
      setPosition({ x: 0, y: 0 })
      setShowForm(true)
    }
  }

  return (
    <>
      <div className="coding-inline-actions">
        <button
          className="legacy-button"
          type="button"
          disabled={readOnly}
          onClick={() => {
            setDraft({ ...emptyPerson, personDocLink: currentDocControlNumber || '' })
            setEditingPersonId(null)
            setSelectedIndex(null)
            setModalError('')
            setPosition({ x: 0, y: 0 })
            setShowForm(true)
          }}
        >
          New
        </button>
        <button
          className="legacy-button"
          type="button"
          disabled={readOnly}
          onClick={() => {
            if (selectedIndex !== null && persons[selectedIndex]) {
              handleOpenEditPerson(selectedIndex)
            } else {
              setDraft({ ...emptyPerson, personDocLink: currentDocControlNumber || '' })
              setEditingPersonId(null)
              setSelectedIndex(null)
              setModalError('')
              setPosition({ x: 0, y: 0 })
              setShowForm(true)
            }
          }}
        >
          Link
        </button>
        <button
          className="legacy-button"
          type="button"
          disabled={readOnly || selectedIndex === null}
          onClick={removePerson}
        >
          Unlink
        </button>
      </div>

      <div className="person-tracker-fields">
        <CodingField label="PersonDocLink">
          <input
            disabled={readOnly}
            value={draft.personDocLink}
            onChange={(event) => updateDraft('personDocLink', event.target.value)}
          />
        </CodingField>
        <CodingField label="First Name">
          <input
            disabled={readOnly}
            value={draft.firstName}
            onChange={(event) => updateDraft('firstName', event.target.value)}
          />
        </CodingField>
        <CodingField label="Last Name">
          <input
            disabled={readOnly}
            value={draft.lastName}
            onChange={(event) => updateDraft('lastName', event.target.value)}
          />
        </CodingField>
        <CodingField label="Role">
          <input
            disabled={readOnly}
            value={draft.role || draft.dataOwner || ''}
            onChange={(event) => {
              updateDraft('role', event.target.value)
              updateDraft('dataOwner', event.target.value)
            }}
          />
        </CodingField>
      </div>

      <div className="coding-mini-table-wrap">
        <table className="coding-mini-table">
          <thead>
            <tr>
              <th>PersonDocLink</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {persons.length ? (
              persons.map((person, index) => (
                <tr
                  className={selectedIndex === index ? 'is-selected' : ''}
                  key={person._id || `${person.personDocLink}-${index}`}
                  onClick={() => handleSelectPerson(index)}
                  onDoubleClick={() => handleOpenEditPerson(index)}
                >
                  <td>{person.personDocLink}</td>
                  <td>{person.firstName}</td>
                  <td>{person.lastName}</td>
                  <td>{person.role || person.dataOwner || ''}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="coding-empty">
                  No linked persons
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PersonTrackerModal
          draft={draft}
          updateDraft={updateDraft}
          onSave={addPerson}
          onClose={() => {
            setShowForm(false)
            setEditingPersonId(null)
          }}
          position={position}
          isDragging={isDragging}
          handleMouseDown={handleMouseDown}
          isSaving={isSaving}
          error={modalError}
        />
      )}
    </>
  )
}

export default function CodingPage() {
  const { user } = useAuth()
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routeDocumentId = location.pathname.split('/').filter(Boolean).at(-2)

  const [document, setDocument] = useState(null)
  const [activeBatchDocs, setActiveBatchDocs] = useState([])
  const [coding, setCoding] = useState(defaultCoding)
  const [serverReadOnly, setServerReadOnly] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isBatchCompleted, setIsBatchCompleted] = useState(false)
  const [selectedLayout, setSelectedLayout] = useState('First Level Coding (FLR)')
  const [familyGroupOpen, setFamilyGroupOpen] = useState(false)

  // Person modal for Alternate Workflow layout
  const [showAwfPersonForm, setShowAwfPersonForm] = useState(false)
  const [awfPersonDraft, setAwfPersonDraft] = useState(emptyPerson)
  const [editingAwfPersonId, setEditingAwfPersonId] = useState(null)
  const [selectedAwfPersonIndex, setSelectedAwfPersonIndex] = useState(null)
  const [awfPosition, setAwfPosition] = useState({ x: 0, y: 0 })
  const [isAwfDragging, setIsAwfDragging] = useState(false)
  const [awfDragStart, setAwfDragStart] = useState({ x: 0, y: 0 })
  const [isAwfSaving, setIsAwfSaving] = useState(false)
  const [awfModalError, setAwfModalError] = useState('')

  const handleAwfMouseDown = (e) => {
    if (
      e.target.closest('input, textarea, select, button, a, [role="button"]') ||
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT' ||
      e.target.tagName === 'A'
    ) {
      return
    }
    setIsAwfDragging(true)
    setAwfDragStart({ x: e.clientX - awfPosition.x, y: e.clientY - awfPosition.y })
  }

  const handleAwfMouseMove = useCallback(
    (e) => {
      if (!isAwfDragging) return
      setAwfPosition({
        x: e.clientX - awfDragStart.x,
        y: e.clientY - awfDragStart.y,
      })
    },
    [isAwfDragging, awfDragStart]
  )

  const handleAwfMouseUp = useCallback(() => {
    setIsAwfDragging(false)
  }, [])

  useEffect(() => {
    if (isAwfDragging) {
      window.addEventListener('mousemove', handleAwfMouseMove)
      window.addEventListener('mouseup', handleAwfMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleAwfMouseMove)
        window.removeEventListener('mouseup', handleAwfMouseUp)
      }
    }
  }, [isAwfDragging, handleAwfMouseMove, handleAwfMouseUp])

  // Viewer state
  const [viewMode, setViewMode] = useState('native')
  const [viewerError, setViewerError] = useState(false)
  const [textContent, setTextContent] = useState('')
  const [textLoading, setTextLoading] = useState(false)

  const activeProjectId = projectId || 'project-orchid-6-7'

  // Fetch document details and coding from MongoDB
  const loadDocumentData = useCallback(async () => {
    try {
      setSaved(false)
      setSaveError('')
      const docRes = await api.get(`/projects/${activeProjectId}/documents/${routeDocumentId}`)
      if (docRes.data) {
        setDocument(docRes.data)
      }

      // Fetch active batch documents for navigation
      const batchDocsRes = await api.get(`/projects/${activeProjectId}/documents`, {
        params: { view: 'My Batched Out Docs' },
      })
      if (Array.isArray(batchDocsRes.data)) {
        setActiveBatchDocs(batchDocsRes.data)
      }

      const codingRes = await api.get(`/projects/${activeProjectId}/documents/${routeDocumentId}/coding`)
      if (codingRes.data) {
        setCoding({
          ...defaultCoding,
          ...codingRes.data,
          persons: Array.isArray(codingRes.data.persons) ? codingRes.data.persons : [],
        })
        if (typeof codingRes.data.readOnly === 'boolean') {
          setServerReadOnly(codingRes.data.readOnly)
        }
      }
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Failed to load document coding.')
    }
  }, [activeProjectId, routeDocumentId])

  useEffect(() => {
    loadDocumentData()
  }, [loadDocumentData])

  // Ownership resolution
  const batch = document?.batchId
  const isAdmin = user?.role === 'admin'
  const isBatchActiveAndLocked = Boolean(batch && batch.isLocked && batch.status === 'In Progress')
  const isBatchOwner = Boolean(
    user &&
    batch &&
    (
      (user.id && batch.lockedBy && String(batch.lockedBy) === String(user.id)) ||
      (user.id && batch.assignedTo && String(batch.assignedTo) === String(user.id)) ||
      (user.username && batch.assignedToName && batch.assignedToName === user.username)
    )
  )

  const isAssignedToMe = isAdmin || (isBatchActiveAndLocked && isBatchOwner)
  const readOnly = isAdmin ? false : (serverReadOnly !== null ? serverReadOnly : !isAssignedToMe)

  const update = (key, value) => {
    setCoding((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const updatePersons = (next) => {
    setSaved(false)
    setCoding((current) => ({
      ...current,
      persons: typeof next === 'function' ? next(current.persons) : next,
    }))
  }

  // Save coding to backend MongoDB
  const saveCoding = async (andNext = false, goBack = false) => {
    if (readOnly) return
    setSaveError('')
    try {
      const { data } = await api.put(`/projects/${activeProjectId}/documents/${routeDocumentId}/coding`, {
        ...coding,
      })

      setSaved(true)
      if (data?.batchCompleted) {
        setIsBatchCompleted(true)
      }

      if (goBack) {
        navigate(`/projects/${projectId}/documents`)
        return
      }

      if (andNext) {
        const currentIndex = activeBatchDocs.findIndex(
          (d) => d._id === routeDocumentId || d.controlNumber === routeDocumentId
        )
        if (currentIndex !== -1 && currentIndex + 1 < activeBatchDocs.length) {
          const nextDoc = activeBatchDocs[currentIndex + 1]
          navigate(`/projects/${projectId}/documents/${nextDoc._id || nextDoc.controlNumber}/coding`)
        } else if (data?.batchCompleted) {
          setTimeout(() => {
            navigate(`/projects/${projectId}/documents`)
          }, 500)
        }
      }
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Failed to save coding to server.')
    }
  }

  // Direct persistence handler for Person Tracker entries
  const handleSavePersonEntry = async (personDraft, editingId = null) => {
    if (readOnly) {
      throw new Error("Cannot edit document belonging to another employee's batch.")
    }
    const currentPersons = coding.persons || []
    const targetId = editingId || personDraft._id || null
    let updatedPersons

    if (targetId && currentPersons.some((p) => p._id && String(p._id) === String(targetId))) {
      // Update existing person in place preserving stable _id and creation audit metadata
      updatedPersons = currentPersons.map((p) => {
        if (p._id && String(p._id) === String(targetId)) {
          return {
            ...p,
            ...personDraft,
            _id: p._id,
            createdBy: p.createdBy,
            createdAt: p.createdAt,
          }
        }
        return p
      })
    } else {
      // Create new person entry with stable _id
      const newPersonId = personDraft._id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)
      const newPerson = {
        ...personDraft,
        _id: newPersonId,
      }
      updatedPersons = [...currentPersons, newPerson]
    }

    const payload = {
      ...coding,
      persons: updatedPersons,
    }
    const { data } = await api.put(`/projects/${activeProjectId}/documents/${routeDocumentId}/coding`, payload)
    setCoding((current) => ({
      ...current,
      persons: Array.isArray(data?.persons) ? data.persons : updatedPersons,
    }))
    setSaved(true)
    if (data?.batchCompleted) {
      setIsBatchCompleted(true)
    }
    return data
  }

  const handlePersistUpdatedPersons = async (updatedPersons) => {
    if (readOnly) return
    const payload = {
      ...coding,
      persons: updatedPersons,
    }
    const { data } = await api.put(`/projects/${activeProjectId}/documents/${routeDocumentId}/coding`, payload)
    setCoding((current) => ({
      ...current,
      persons: Array.isArray(data?.persons) ? data.persons : updatedPersons,
    }))
    setSaved(true)
    if (data?.batchCompleted) {
      setIsBatchCompleted(true)
    }
    return data
  }

  const addAwfPerson = async () => {
    if (!awfPersonDraft.firstName && !awfPersonDraft.lastName && !awfPersonDraft.personDocLink && !awfPersonDraft.dataOwner) {
      setAwfModalError('Please enter at least a First Name, Last Name, or PersonDocLink.')
      return
    }
    if (readOnly) {
      setAwfModalError("Cannot edit document belonging to another employee's batch.")
      return
    }

    setIsAwfSaving(true)
    setAwfModalError('')
    try {
      await handleSavePersonEntry(awfPersonDraft, editingAwfPersonId)
      setAwfPersonDraft(emptyPerson)
      setEditingAwfPersonId(null)
      setShowAwfPersonForm(false)
    } catch (err) {
      setAwfModalError(err.response?.data?.error || err.message || 'Failed to save person to database.')
    } finally {
      setIsAwfSaving(false)
    }
  }

  const removeAwfPerson = async () => {
    if (selectedAwfPersonIndex === null || readOnly) return
    const updatedPersons = (coding.persons || []).filter((_, i) => i !== selectedAwfPersonIndex)
    try {
      await handlePersistUpdatedPersons(updatedPersons)
      setSelectedAwfPersonIndex(null)
      setEditingAwfPersonId(null)
      setAwfPersonDraft(emptyPerson)
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to remove person.')
    }
  }

  const handleSelectAwfPerson = (index) => {
    setSelectedAwfPersonIndex(index)
    const person = (coding.persons || [])[index]
    if (person) {
      setAwfPersonDraft({ ...emptyPerson, ...person })
      setEditingAwfPersonId(person._id || null)
    }
  }

  const handleOpenEditAwfPerson = (index) => {
    setSelectedAwfPersonIndex(index)
    const person = (coding.persons || [])[index]
    if (person) {
      setAwfPersonDraft({ ...emptyPerson, ...person })
      setEditingAwfPersonId(person._id || null)
      setAwfModalError('')
      setAwfPosition({ x: 0, y: 0 })
      setShowAwfPersonForm(true)
    }
  }

  // Navigation indices for Previous / Next buttons
  const currentIndex = activeBatchDocs.findIndex(
    (d) => d._id === routeDocumentId || d.controlNumber === routeDocumentId
  )
  const prevDoc = currentIndex > 0 ? activeBatchDocs[currentIndex - 1] : null
  const nextDoc = currentIndex !== -1 && currentIndex + 1 < activeBatchDocs.length ? activeBatchDocs[currentIndex + 1] : null

  const goToPrev = () => {
    if (prevDoc) {
      navigate(`/projects/${projectId}/documents/${prevDoc._id || prevDoc.controlNumber}/coding`)
    }
  }

  const goToNext = () => {
    if (nextDoc) {
      navigate(`/projects/${projectId}/documents/${nextDoc._id || nextDoc.controlNumber}/coding`)
    }
  }

  const radioList = (name, options, value, key) => (
    <div className="coding-radio-stack">
      {options.map((option) => (
        <label key={option}>
          <input
            disabled={readOnly}
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => update(key, option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  )

  // Text loader effect for txt and csv documents
  useEffect(() => {
    setViewerError(false)
    setTextContent('')
    if (!document?.fileUrl) return

    const format = (document.format || document.fileName?.split('.').pop() || '').toLowerCase()
    if (format === 'txt' || format === 'csv') {
      let isCurrent = true
      setTextLoading(true)
      fetch(document.fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch text content')
          return res.text()
        })
        .then((text) => {
          if (isCurrent) {
            setTextContent(text)
            setTextLoading(false)
          }
        })
        .catch((err) => {
          if (isCurrent) {
            console.error('Error loading text content:', err)
            setTextLoading(false)
            setViewerError(true)
          }
        })

      return () => {
        isCurrent = false
      }
    }
  }, [document?.fileUrl, document?.format, document?.fileName])

  const docControlNumber = document?.controlNumber || routeDocumentId || ''
  const docFileName = document?.fileName || ''
  const format = (document?.format || document?.fileName?.split('.').pop() || '').toLowerCase()
  const hasFile = Boolean(document?.fileUrl)

  const renderViewer = () => {
    // Extracted Text View
    if (viewMode === 'extracted') {
      const extractedText = document?.extractedText || (['txt', 'csv'].includes(format) ? textContent : '')
      if (extractedText) {
        return (
          <div className="coding-text-container">
            <pre className="coding-text-pre">{extractedText}</pre>
          </div>
        )
      }
      return (
        <div className="coding-no-file-viewer">
          <div className="no-file-card">
            <p className="no-file-title">No extracted text available</p>
            <p className="no-file-subtitle">There is no extracted text record for this document.</p>
          </div>
        </div>
      )
    }

    // No file attached
    if (!hasFile) {
      return (
        <div className="coding-no-file-viewer">
          <div className="no-file-card">
            <p className="no-file-title">No document file attached.</p>
            <p className="no-file-subtitle">Document metadata is loaded. The coding form remains fully usable.</p>
          </div>
        </div>
      )
    }

    // Error state
    if (viewerError) {
      return (
        <div className="coding-unsupported-container">
          <div className="coding-fallback-card error-card">
            <div className="fallback-badge">ERROR</div>
            <div className="fallback-filename">{docFileName || 'Document'}</div>
            <p className="fallback-message">Unable to preview this document.</p>
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="legacy-button primary-legacy"
              download={docFileName}
            >
              Download Native File
            </a>
          </div>
        </div>
      )
    }

    // PDF files
    if (format === 'pdf') {
      return (
        <iframe
          key={document.fileUrl}
          src={`${document.fileUrl}#toolbar=1&navpanes=0`}
          title={docFileName || 'PDF Document'}
          className="coding-pdf-frame"
          onError={() => setViewerError(true)}
        />
      )
    }

    // Image files
    if (['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif', 'svg'].includes(format)) {
      return (
        <div className="coding-image-container">
          <img
            key={document.fileUrl}
            src={document.fileUrl}
            alt={docFileName || 'Image Document'}
            className="coding-image-element"
            onError={() => setViewerError(true)}
          />
        </div>
      )
    }

    // Text and CSV files
    if (['txt', 'csv'].includes(format)) {
      if (textLoading) {
        return <div className="coding-viewer-loading">Loading text content...</div>
      }
      return (
        <div className="coding-text-container">
          <pre className="coding-text-pre">{textContent || '(Empty file)'}</pre>
        </div>
      )
    }

    // Office documents (doc, docx, xls, xlsx, ppt, pptx)
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(format)) {
      return (
        <div className="coding-office-container">
          <iframe
            key={document.fileUrl}
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(document.fileUrl)}&embedded=true`}
            title={docFileName || 'Office Document'}
            className="coding-office-frame"
            onError={() => setViewerError(true)}
          />
          <div className="coding-office-fallback-bar">
            <span>
              <strong>{docFileName}</strong> ({format.toUpperCase()})
              {document.fileSize ? ` — ${(document.fileSize / 1024).toFixed(1)} KB` : ''}
            </span>
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="legacy-button"
              download={docFileName}
            >
              Download Native File
            </a>
          </div>
        </div>
      )
    }

    // Unsupported file formats
    return (
      <div className="coding-unsupported-container">
        <div className="coding-fallback-card">
          <div className="fallback-badge">{(format || 'FILE').toUpperCase()}</div>
          <div className="fallback-filename">{docFileName || 'Document'}</div>
          <div className="fallback-details">
            <span>Type: {format ? format.toUpperCase() : 'Unknown'}</span>
            {document.fileSize && <span>Size: {(document.fileSize / 1024).toFixed(1)} KB</span>}
          </div>
          <p className="fallback-message">Preview unavailable for this file format.</p>
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="legacy-button primary-legacy"
            download={docFileName}
          >
            Download Native File
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="coding-page">
      {/* Top Document Toolbar */}
      <div className="coding-page-toolbar">
        <div className="coding-document-context">
          <Link to={`/projects/${projectId}/documents`}>Documents</Link>
          <span>/</span>
          <strong>{docControlNumber}</strong>
          <span>{docFileName}</span>
        </div>
        <div className="coding-toolbar-actions">
          <button className="legacy-button" type="button" disabled={!prevDoc} onClick={goToPrev}>
            Previous
          </button>
          <button className="legacy-button" type="button" disabled={!nextDoc} onClick={goToNext}>
            Next
          </button>
          <button
            className="legacy-button primary-legacy"
            type="button"
            disabled={readOnly}
            onClick={() => saveCoding(false, false)}
          >
            Save
          </button>
          <Link className="legacy-button" to={`/projects/${projectId}/documents`}>
            Exit
          </Link>
        </div>
      </div>

      {/* Main Coding Layout Area */}
      <div className="coding-main">
        {/* Document Viewer on the Left */}
        <main className="coding-document-viewer">
          <div className="coding-viewer-toolbar">
            <button
              className={`legacy-button ${viewMode === 'native' ? 'active-viewer-tab' : ''}`}
              type="button"
              onClick={() => setViewMode('native')}
            >
              Native
            </button>
            <button
              className={`legacy-button ${viewMode === 'extracted' ? 'active-viewer-tab' : ''}`}
              type="button"
              onClick={() => setViewMode('extracted')}
            >
              Extracted Text
            </button>
            <span className="toolbar-spacer" />
            <span>Document View</span>
          </div>
          <div className="coding-viewer-container" aria-label="Document viewer">
            {renderViewer()}
          </div>
        </main>

        {/* Coding Layout Panel on the Right */}
        <aside className="coding-panel">
          {/* Header */}
          <div className="coding-panel-header">
            <div className="coding-panel-header-top">
              <span className="coding-panel-tab-title">Coding Layout</span>
            </div>

            {/* Action Buttons */}
            <div className="coding-panel-header-actions">
              {selectedLayout === 'First Level Coding (FLR)' ? (
                <>
                  <button
                    className="legacy-button primary-legacy"
                    type="button"
                    disabled={readOnly}
                    onClick={() => saveCoding(true, false)}
                  >
                    Save &amp; Next
                  </button>
                  <button
                    className="legacy-button"
                    type="button"
                    disabled={readOnly}
                    onClick={() => saveCoding(false, false)}
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="legacy-button primary-legacy"
                    type="button"
                    disabled={readOnly}
                    onClick={() => saveCoding(false, false)}
                  >
                    Save
                  </button>
                  <button
                    className="legacy-button"
                    type="button"
                    disabled={readOnly}
                    onClick={() => saveCoding(false, true)}
                  >
                    Save &amp; Back
                  </button>
                </>
              )}
              <button
                className="legacy-button"
                type="button"
                onClick={() => loadDocumentData()}
              >
                Cancel
              </button>
            </div>

            {/* Layout Selector */}
            <div className="coding-layout-selector-row">
              <select
                value={selectedLayout}
                onChange={(e) => setSelectedLayout(e.target.value)}
                aria-label="Layout selector"
              >
                <option value="First Level Coding (FLR)">First Level Coding (FLR)</option>
                <option value="Alternate Workflow">Alternate Workflow</option>
              </select>
              <button type="button" title="Edit layout">
                ✏️
              </button>
            </div>
          </div>

          {/* Form Scroll Area */}
          <div className="coding-panel-scroll">
            {selectedLayout === 'First Level Coding (FLR)' ? (
              /* ================= FIRST LEVEL CODING (FLR) LAYOUT ================= */
              <div>
                {/* 1. FLR Coding Section */}
                <Section title="FLR Coding">
                  <div className="coding-metadata-grid">
                    <span>Control Number</span>
                    <strong>{docControlNumber}</strong>
                    <span>File Name</span>
                    <strong>{docFileName}</strong>
                    <span>Source Path</span>
                    <strong>-</strong>
                  </div>

                  {/* 1. AL Designation */}
                  <CodingField label="AL Designation">
                    {radioList('alDesignation', ['Relevant', 'Not Relevant'], coding.alDesignation || 'Relevant', 'alDesignation')}
                  </CodingField>

                  {/* 2. FLR Review Complete */}
                  <CodingField label="FLR Review Complete">
                    {radioList('flrComplete', ['Yes', 'No'], coding.flrComplete || 'Yes', 'flrComplete')}
                  </CodingField>

                  {/* 3. Reportable Data Found */}
                  <CodingField label="Reportable Data Found">
                    {radioList(
                      'reportableDataFound',
                      [
                        'Yes',
                        'No',
                        'Needs Further Review',
                        'Technical Issue',
                        'Password Protected',
                        'Foreign Language',
                        'Illegible',
                        'Duplicate',
                        'Alternate Workflow 6+ Entries',
                      ],
                      coding.reportableDataFound || 'Alternate Workflow 6+ Entries',
                      'reportableDataFound'
                    )}
                  </CodingField>

                  {/* 4. Extraction Status */}
                  <CodingField label="Extraction Status">
                    {radioList(
                      'extractionStatus',
                      ['Completed', 'Yes to No', 'Yes to AWF'],
                      coding.extractionStatus || 'Completed',
                      'extractionStatus'
                    )}
                  </CodingField>

                  {/* 5. Alternate Workflow Estimate */}
                  <CodingField label="Alternate Workflow Estimate">
                    {radioList(
                      'alternateWorkflowEstimate',
                      ['6 - 25 Entries', '26 - 50 Entries', '51 - 150 Entries', '151+ Entries'],
                      coding.alternateWorkflowEstimate || '6 - 25 Entries',
                      'alternateWorkflowEstimate'
                    )}
                  </CodingField>

                  {/* 6, 7, 8: Text Inputs */}
                  <div className="coding-inline-meta">
                    <CodingField label="Extracted Outside Relativity">
                      <input
                        disabled={readOnly}
                        value={coding.extractedOutsideRelativity || ''}
                        onChange={(event) => update('extractedOutsideRelativity', event.target.value)}
                      />
                    </CodingField>
                    <CodingField label="TXT Status">
                      <input
                        disabled={readOnly}
                        value={coding.txtStatus || ''}
                        onChange={(event) => update('txtStatus', event.target.value)}
                      />
                    </CodingField>
                    <CodingField label="Entries Completed">
                      <input
                        disabled={readOnly}
                        value={coding.entriesCompleted || ''}
                        onChange={(event) => update('entriesCompleted', event.target.value)}
                      />
                    </CodingField>
                  </div>
                </Section>

                {/* 9. Reviewer Notes Section */}
                <Section title="Reviewer Notes">
                  <textarea
                    className="coding-notes"
                    disabled={readOnly}
                    value={coding.reviewerNotes || ''}
                    onChange={(event) => update('reviewerNotes', event.target.value)}
                    placeholder="Reviewer Notes"
                  />
                </Section>

                {/* 10. Person Tracker (PersonDocLink) Section */}
                <Section title="Person Tracker (PersonDocLink)">
                  <PersonTracker
                    persons={coding.persons || []}
                    setPersons={updatePersons}
                    onSavePerson={handleSavePersonEntry}
                    onRemovePerson={handlePersistUpdatedPersons}
                    readOnly={readOnly}
                    currentDocControlNumber={document?.controlNumber || ''}
                  />
                </Section>

                {/* 11. Family Group Section */}
                <Section title="Family Group">
                  <CodingField label="Family Group">
                    <select
                      disabled={readOnly}
                      value={coding.familyGroup || 'None'}
                      onChange={(event) => update('familyGroup', event.target.value)}
                    >
                      <option>None</option>
                      <option>Orion Correspondence</option>
                      <option>Orion Financial Records</option>
                    </select>
                  </CodingField>
                </Section>

                {/* 12. Production History Section */}
                <Section title="Production History" defaultOpen={false}>
                  <div className="coding-history-row">
                    <span>Production Set</span>
                    <strong>None</strong>
                  </div>
                  <div className="coding-history-row">
                    <span>Last Modified</span>
                    <strong>Current document</strong>
                  </div>
                </Section>
              </div>
            ) : (
              /* ALTERNATE WORKFLOW LAYOUT */
              <div className="coding-awf-layout">
                {/* Section 1: AL Designation */}
                <div className="coding-relativity-section">
                  <div className="coding-relativity-section-header">AL Designation</div>
                  <div className="coding-relativity-section-body">
                    {radioList(
                      'alDesignation_awf',
                      ['Relevant', 'Not Relevant', 'Needs 2nd Pass Review'],
                      coding.alDesignation || 'Relevant',
                      'alDesignation'
                    )}
                  </div>
                </div>

                {/* Section 2: Alternate Workflow */}
                <div className="coding-relativity-section">
                  <div className="coding-relativity-section-header">Alternate Workflow</div>
                  <div className="coding-relativity-section-body">
                    <div className="coding-field">
                      <label>Reportable Data Found</label>
                      <select
                        disabled={readOnly}
                        value={coding.reportableDataFound || 'Alternate Workflow 6+ Entries'}
                        onChange={(e) => update('reportableDataFound', e.target.value)}
                      >
                        <option>Alternate Workflow 6+ Entries</option>
                        <option>No</option>
                        <option>Yes</option>
                      </select>
                    </div>

                    <div className="coding-field">
                      <label>Alternate Workflow Estimate</label>
                      <select
                        disabled={readOnly}
                        value={coding.alternateWorkflowEstimate || '6 - 25 Entries'}
                        onChange={(e) => update('alternateWorkflowEstimate', e.target.value)}
                      >
                        <option>6 - 25 Entries</option>
                        <option>26 - 100 Entries</option>
                        <option>100+ Entries</option>
                      </select>
                    </div>

                    <div className="coding-field">
                      <label>Alternate Workflow Complete</label>
                      <select
                        disabled={readOnly}
                        value={coding.alternateWorkflowComplete || 'Yes'}
                        onChange={(e) => update('alternateWorkflowComplete', e.target.value)}
                      >
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>

                    <div className="coding-field">
                      <label>AWF Extraction Completed</label>
                      <select
                        disabled={readOnly}
                        value={coding.awfExtractionCompleted || 'Yes'}
                        onChange={(e) => update('awfExtractionCompleted', e.target.value)}
                      >
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Reviewer Notes */}
                <div className="coding-relativity-section">
                  <div className="coding-relativity-section-header">Reviewer Notes</div>
                  <div className="coding-relativity-section-body">
                    <textarea
                      className="coding-notes"
                      disabled={readOnly}
                      value={coding.reviewerNotes || ''}
                      onChange={(event) => update('reviewerNotes', event.target.value)}
                      placeholder="Reviewer Notes"
                    />
                  </div>
                </div>

                {/* Section 4: Person Tracker (PersonDocLink) */}
                <div className="coding-relativity-section">
                  <div className="person-tracker-header-row">
                    <span>Person Tracker (PersonDocLink)</span>
                    <div className="person-tracker-header-actions">
                      <button
                        className="legacy-button"
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          setAwfPersonDraft({ ...emptyPerson, personDocLink: document?.controlNumber || '' })
                          setEditingAwfPersonId(null)
                          setSelectedAwfPersonIndex(null)
                          setAwfModalError('')
                          setAwfPosition({ x: 0, y: 0 })
                          setShowAwfPersonForm(true)
                        }}
                      >
                        New
                      </button>
                      <button
                        className="legacy-button"
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          if (selectedAwfPersonIndex !== null && (coding.persons || [])[selectedAwfPersonIndex]) {
                            handleOpenEditAwfPerson(selectedAwfPersonIndex)
                          } else {
                            setAwfPersonDraft({ ...emptyPerson, personDocLink: document?.controlNumber || '' })
                            setEditingAwfPersonId(null)
                            setSelectedAwfPersonIndex(null)
                            setAwfModalError('')
                            setAwfPosition({ x: 0, y: 0 })
                            setShowAwfPersonForm(true)
                          }
                        }}
                      >
                        Link
                      </button>
                      <button
                        className="legacy-button"
                        type="button"
                        disabled={readOnly || selectedAwfPersonIndex === null}
                        onClick={removeAwfPerson}
                      >
                        Unlink
                      </button>
                    </div>
                  </div>

                  <div className="coding-mini-table-wrap" style={{ margin: '6px 10px' }}>
                    <table className="coding-mini-table">
                      <thead>
                        <tr>
                          <th>PersonDocLink</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coding.persons && coding.persons.length ? (
                          coding.persons.map((person, index) => (
                            <tr
                              className={selectedAwfPersonIndex === index ? 'is-selected' : ''}
                              key={person._id || `${person.personDocLink}-${index}`}
                              onClick={() => handleSelectAwfPerson(index)}
                              onDoubleClick={() => handleOpenEditAwfPerson(index)}
                            >
                              <td>{person.personDocLink}</td>
                              <td>{person.firstName}</td>
                              <td>{person.lastName}</td>
                              <td>{person.role || person.dataOwner || ''}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="coding-empty">
                              No linked persons
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 5: Family Group Accordion Bar */}
                <div
                  className="family-group-accordion-bar"
                  onClick={() => setFamilyGroupOpen((v) => !v)}
                >
                  <span>Family Group {familyGroupOpen ? '▲' : '▼'}</span>
                  <span>☰ ⤢</span>
                </div>

                {familyGroupOpen && (
                  <div style={{ padding: '8px 10px', background: '#eaeff2' }}>
                    <select
                      disabled={readOnly}
                      value={coding.familyGroup || 'None'}
                      onChange={(e) => update('familyGroup', e.target.value)}
                      style={{ width: '100%', height: '26px' }}
                    >
                      <option>None</option>
                      <option>Orion Correspondence</option>
                      <option>Orion Financial Records</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Save & ReadOnly Status */}
          <div className="coding-save-status">
            {readOnly && (
              <span>
                Read-only: batch is taken by {batch?.assignedToName || 'another user'}.
              </span>
            )}
            {saved && !isBatchCompleted && <span>Saved</span>}
            {isBatchCompleted && <span>Batch completed! All documents reviewed.</span>}
            {saveError && <span style={{ color: '#9b1c1c' }}>{saveError}</span>}
          </div>
        </aside>
      </div>

      {/* Person Tracker Modal for Alternate Workflow layout */}
      {showAwfPersonForm && (
        <PersonTrackerModal
          draft={awfPersonDraft}
          updateDraft={(key, value) => {
            setAwfPersonDraft((c) => ({ ...c, [key]: value }))
            if (awfModalError) setAwfModalError('')
          }}
          onSave={addAwfPerson}
          onClose={() => {
            setShowAwfPersonForm(false)
            setEditingAwfPersonId(null)
          }}
          position={awfPosition}
          isDragging={isAwfDragging}
          handleMouseDown={handleAwfMouseDown}
          isSaving={isAwfSaving}
          error={awfModalError}
        />
      )}
    </div>
  )
}
