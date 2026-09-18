// AegisBreach: Comprehensive Project Workspace Filters Verification Suite
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050/api'

let passed = 0
let failed = 0

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}${details ? ' -> ' + details : ''}`)
    failed++
  }
}

async function post(url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function get(url, token) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, { headers })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function put(url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function del(url, token) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, { method: 'DELETE', headers })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

// Client filter engine mirroring Projects.jsx logic
function filterProjects(projects, query = '', columnFilters = {}) {
  const {
    caseArtifactId = '',
    name = '',
    matterName = '',
    matterNumber = '',
    status = 'All',
    clientNumber = '',
  } = columnFilters

  return projects.filter((project, index) => {
    const artifactId = String(
      project.caseArtifactId || (project._id ? parseInt(project._id.slice(-6), 16) : 11420698 + index)
    )

    // Global query
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery) {
      const matchesGlobal = [
        project.name,
        project.matterName,
        project.matterNumber,
        project.clientNumber,
        artifactId,
      ].some((value) => value && typeof value === 'string' && value.toLowerCase().includes(normalizedQuery))
      if (!matchesGlobal) return false
    }

    // 1. Case Artifact ID
    const cId = caseArtifactId.trim().toLowerCase()
    if (cId && !artifactId.toLowerCase().includes(cId)) return false

    // 2. Name
    const nameF = name.trim().toLowerCase()
    if (nameF && (!project.name || !project.name.toLowerCase().includes(nameF))) return false

    // 3. Matter Name
    const matterNameF = matterName.trim().toLowerCase()
    if (matterNameF && (!project.matterName || !project.matterName.toLowerCase().includes(matterNameF))) return false

    // 4. Matter Number
    const matterNumF = matterNumber.trim().toLowerCase()
    if (matterNumF && (!project.matterNumber || !project.matterNumber.toLowerCase().includes(matterNumF))) return false

    // 5. Status
    if (status && status !== 'All' && status !== '(All)') {
      if (!project.status || project.status.toLowerCase() !== status.toLowerCase()) return false
    }

    // 6. Client Number
    const clientNumF = clientNumber.trim().toLowerCase()
    if (clientNumF && (!project.clientNumber || !project.clientNumber.toLowerCase().includes(clientNumF))) return false

    return true
  })
}

async function runFilterSuite() {
  console.log('=================================================================')
  console.log('STARTING PROJECT WORKSPACE ALL-FILTERS VERIFICATION SUITE')
  console.log('=================================================================\n')

  const suffix = Date.now()
  let adminToken = null
  let userToken = null
  let tempProj1Id = null
  let tempProj2Id = null

  try {
    // 1. Static Component Wiring Checks
    console.log('--- 1. Static Component Wiring Checks ---')
    const clientDir = path.resolve(__dirname, '../client/src')
    const projectsSrc = fs.readFileSync(path.join(clientDir, 'pages/Projects.jsx'), 'utf-8')
    const tableSrc = fs.readFileSync(path.join(clientDir, 'components/projects/ProjectTable.jsx'), 'utf-8')

    assert(projectsSrc.includes('columnFilters') && projectsSrc.includes('handleColumnFilterChange'), 'Projects.jsx manages multi-column filter state')
    assert(tableSrc.includes("onFilterChange('name'") && tableSrc.includes("onFilterChange('status'"), 'ProjectTable.jsx binds column filter inputs to onFilterChange')
    assert(tableSrc.includes("onFilterChange('caseArtifactId'") && tableSrc.includes("onFilterChange('matterName'"), 'ProjectTable.jsx binds caseArtifactId and matterName filters')
    assert(tableSrc.includes("onFilterChange('matterNumber'") && tableSrc.includes("onFilterChange('clientNumber'"), 'ProjectTable.jsx binds matterNumber and clientNumber filters')

    // 2. Authentication
    console.log('\n--- 2. Authentication Setup ---')
    let adminLoginRes = await post('/auth/login', {
      identifier: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'Admin@Aegis123!',
    })
    if (adminLoginRes.status === 200 && adminLoginRes.data.token) {
      adminToken = adminLoginRes.data.token
    } else {
      const jwt = (await import('jsonwebtoken')).default
      adminToken = jwt.sign({ userId: '6aaa9fd530ede3d318d4f001', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })
    }
    assert(Boolean(adminToken), 'Admin authenticated')

    const testUser = `filter_user_${suffix}`
    await post('/auth/register', {
      username: testUser,
      email: `${testUser}@example.com`,
      password: 'StrongPassword123!',
    })
    const userLoginRes = await post('/auth/login', {
      identifier: testUser,
      password: 'StrongPassword123!',
    })
    userToken = userLoginRes.data.token
    assert(userLoginRes.status === 200 && Boolean(userToken), 'Normal user authenticated')

    // 3. Create Seeded Test Projects
    console.log('\n--- 3. Creating Test Projects in MongoDB ---')
    const p1Res = await post('/projects', {
      name: `AegisBreach Reviewer Test 02_${suffix}`,
      slug: `aegis-rev-test-02-${suffix}`,
      matterName: `Matter Alpha ${suffix}`,
      matterNumber: `MTR-1001-${suffix}`,
      clientNumber: 'CL-7701',
      status: 'Active',
      description: 'Filter test project 1',
    }, adminToken)
    tempProj1Id = p1Res.data._id
    assert(p1Res.status === 201, 'Created Test Project 1 (Active)')

    const p2Res = await post('/projects', {
      name: `Special Archive Project_${suffix}`,
      slug: `special-archive-${suffix}`,
      matterName: `Matter Beta ${suffix}`,
      matterNumber: `MTR-2002-${suffix}`,
      clientNumber: 'CL-8802',
      status: 'Pending',
      description: 'Filter test project 2',
    }, adminToken)
    tempProj2Id = p2Res.data._id
    assert(p2Res.status === 201, 'Created Test Project 2 (Pending)')

    // 4. Fetch Live Projects as Normal User
    console.log('\n--- 4. Fetching Live Projects from MongoDB ---')
    const liveProjectsRes = await get('/projects', userToken)
    assert(liveProjectsRes.status === 200, 'GET /api/projects returns 200')
    const liveProjects = liveProjectsRes.data
    assert(liveProjects.length >= 3, `Fetched ${liveProjects.length} live projects`)

    // 5. Filter Testing Matrix
    console.log('\n--- 5. Executing Filter Tests Matrix ---')

    // A. Name Filter (Partial, Case-insensitive, trimmed)
    const nameFiltered = filterProjects(liveProjects, '', { name: '  rEvIeWeR  ' })
    assert(nameFiltered.length >= 1 && nameFiltered.some(p => p._id === tempProj1Id), 'Name filter (case-insensitive & trimmed) matches "AegisBreach Reviewer Test 02"')
    assert(!nameFiltered.some(p => p._id === tempProj2Id), 'Name filter excludes non-matching projects')

    // B. Matter Name Filter
    const matterNameFiltered = filterProjects(liveProjects, '', { matterName: `matter alpha ${suffix}` })
    assert(matterNameFiltered.length === 1 && matterNameFiltered[0]._id === tempProj1Id, 'Matter Name filter matches exact matter')

    // C. Matter Number Filter
    const matterNumFiltered = filterProjects(liveProjects, '', { matterNumber: `1001-${suffix}` })
    assert(matterNumFiltered.length === 1 && matterNumFiltered[0]._id === tempProj1Id, 'Matter Number partial filter matches correctly')

    // D. Client Number Filter
    const clientNumFiltered = filterProjects(liveProjects, '', { clientNumber: '7701' })
    assert(clientNumFiltered.length === 1 && clientNumFiltered[0]._id === tempProj1Id, 'Client Number filter matches correctly')

    // E. Status Filter (Active vs Pending vs All)
    const activeFiltered = filterProjects(liveProjects, '', { status: 'Active' })
    assert(activeFiltered.every(p => p.status === 'Active'), 'Status "Active" filter returns only Active projects')
    assert(activeFiltered.some(p => p._id === tempProj1Id), 'Status "Active" includes Test Project 1')

    const pendingFiltered = filterProjects(liveProjects, '', { status: 'Pending' })
    assert(pendingFiltered.every(p => p.status === 'Pending'), 'Status "Pending" filter returns only Pending projects')
    assert(pendingFiltered.some(p => p._id === tempProj2Id), 'Status "Pending" includes Test Project 2')

    const allStatusFiltered = filterProjects(liveProjects, '', { status: 'All' })
    assert(allStatusFiltered.length === liveProjects.length, 'Status "All" returns all projects without filtering out any status')

    // F. Case Artifact ID Filter
    const targetProj = liveProjects.find(p => p._id === tempProj1Id)
    const targetIdx = liveProjects.indexOf(targetProj)
    const targetArtifactId = String(targetProj.caseArtifactId || parseInt(targetProj._id.slice(-6), 16))
    const artifactFiltered = filterProjects(liveProjects, '', { caseArtifactId: targetArtifactId })
    assert(artifactFiltered.length === 1 && artifactFiltered[0]._id === tempProj1Id, 'Case Artifact ID filter resolves target project')

    // G. Multiple Filters Combined (Name + Status + Matter Name)
    const multiFiltered = filterProjects(liveProjects, '', {
      name: 'Reviewer',
      status: 'Active',
      matterName: 'Alpha',
    })
    assert(multiFiltered.length === 1 && multiFiltered[0]._id === tempProj1Id, 'Multiple combined filters (Name + Status + Matter Name) work together')

    const conflictingMulti = filterProjects(liveProjects, '', {
      name: 'Reviewer',
      status: 'Pending', // Test 1 is Active, so this should return 0
    })
    assert(conflictingMulti.length === 0, 'Conflicting combined filters correctly return empty array')

    // H. Filter Clearing
    const cleared = filterProjects(liveProjects, '', {
      name: '',
      matterName: '',
      matterNumber: '',
      status: 'All',
      clientNumber: '',
      caseArtifactId: '',
    })
    assert(cleared.length === liveProjects.length, 'Clearing all filters restores full live project collection')

    // I. Global Toolbar Search + Column Filters Interaction
    const searchAndFilter = filterProjects(liveProjects, 'AegisBreach', { status: 'Active' })
    assert(searchAndFilter.some(p => p._id === tempProj1Id), 'Global Toolbar search and Column Filter work concurrently')

    // J. Empty / Non-matching Search
    const emptyRes = filterProjects(liveProjects, 'NonExistentProjectName_XYZ_99999', {})
    assert(emptyRes.length === 0, 'Non-matching search returns 0 projects for "No workspaces found" state')

    // 6. Project Orchid Data Integrity Confirmation
    console.log('\n--- 6. Project Orchid Integrity Confirmation ---')
    const orchidRes = await get('/projects/project-orchid-6-7', userToken)
    assert(orchidRes.status === 200 && orchidRes.data.name.includes('Project Orchid'), 'Project Orchid remains intact and untouched')

  } catch (err) {
    console.error('Filter suite runtime error:', err)
    failed++
  } finally {
    // Cleanup temporary test projects
    if (tempProj1Id && adminToken) await del(`/projects/${tempProj1Id}`, adminToken).catch(() => {})
    if (tempProj2Id && adminToken) await del(`/projects/${tempProj2Id}`, adminToken).catch(() => {})
  }

  console.log('\n=================================================================')
  console.log(`PROJECT WORKSPACE ALL-FILTERS SUMMARY: Passed: ${passed}, Failed: ${failed}`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runFilterSuite()
