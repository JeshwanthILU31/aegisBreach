// AegisBreach: Reviewer Projects Dynamic Data Source Verification Suite
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

async function runReviewerProjectsTests() {
  console.log('=================================================================')
  console.log('STARTING REVIEWER PROJECTS DYNAMIC DATA SOURCE INTEGRATION TESTS')
  console.log('=================================================================\n')

  const suffix = Date.now()
  let adminToken = null
  let userToken = null
  let tempProjectId = null

  try {
    // 1. Static frontend inspection: No static projects imports
    console.log('--- 1. Static Frontend Architecture Verification ---')
    const clientDir = path.resolve(__dirname, '../client/src')
    const projectsSrc = fs.readFileSync(path.join(clientDir, 'pages/Projects.jsx'), 'utf-8')
    const workspaceSrc = fs.readFileSync(path.join(clientDir, 'pages/ProjectWorkspace.jsx'), 'utf-8')
    const tableSrc = fs.readFileSync(path.join(clientDir, 'components/projects/ProjectTable.jsx'), 'utf-8')

    assert(!projectsSrc.includes("from '../data/projects'"), 'Projects.jsx does NOT import static data/projects')
    assert(projectsSrc.includes('projectsApi.getProjects()'), 'Projects.jsx calls projectsApi.getProjects()')
    assert(!workspaceSrc.includes("from '../data/projects'"), 'ProjectWorkspace.jsx does NOT import static data/projects')
    assert(workspaceSrc.includes('projectsApi.getProject(projectId)'), 'ProjectWorkspace.jsx calls projectsApi.getProject(projectId)')
    assert(tableSrc.includes('project.slug || project._id || project.id'), 'ProjectTable.jsx uses dynamic project keys and links')

    // 2. Authentication setup
    console.log('\n--- 2. Authenticating User and Admin ---')
    const adminLoginRes = await post('/auth/login', {
      identifier: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'Admin@Aegis123!',
    })
    adminToken = adminLoginRes.data.token
    assert(adminLoginRes.status === 200 && Boolean(adminToken), 'Admin authenticated successfully')

    const testUsername = `rev_user_${suffix}`
    const regRes = await post('/auth/register', {
      username: testUsername,
      email: `${testUsername}@example.com`,
      password: 'StrongPassword123!',
    })
    assert(regRes.status === 201, 'Normal reviewer registered')

    const userLoginRes = await post('/auth/login', {
      identifier: testUsername,
      password: 'StrongPassword123!',
    })
    userToken = userLoginRes.data.token
    assert(userLoginRes.status === 200 && Boolean(userToken), 'Normal reviewer authenticated')

    // 3. Normal user can read projects from MongoDB
    console.log('\n--- 3. Normal User Reads Live Projects from MongoDB ---')
    const initialUserProjectsRes = await get('/projects', userToken)
    assert(initialUserProjectsRes.status === 200 && Array.isArray(initialUserProjectsRes.data), 'Normal user GET /api/projects succeeds (200)')
    const initialCount = initialUserProjectsRes.data.length
    assert(initialCount > 0, `Normal user received ${initialCount} live projects from MongoDB`)

    // 4. Admin creates "AegisBreach Test Project" -> Normal user sees it
    console.log('\n--- 4. Admin Creates Project -> Normal User Visibility ---')
    const testProjectName = `AegisBreach Test Project ${suffix}`
    const createProjRes = await post('/projects', {
      name: testProjectName,
      slug: `aegisbreach-test-proj-${suffix}`,
      matterName: 'Test Matter',
      matterNumber: `MTR-${suffix}`,
      clientNumber: 'CL-9999',
      status: 'Active',
      description: 'Reviewer visibility verification project',
    }, adminToken)
    assert(createProjRes.status === 201, 'Admin created new project in MongoDB')
    tempProjectId = createProjRes.data._id

    // Reviewer queries projects
    const afterCreateRes = await get('/projects', userToken)
    assert(afterCreateRes.status === 200, 'Reviewer queries GET /api/projects after admin creation')
    const foundNewProj = afterCreateRes.data.find(p => p._id === tempProjectId || p.name === testProjectName)
    assert(Boolean(foundNewProj), `Normal reviewer immediately sees newly created project "${testProjectName}"`)

    // Reviewer loads project workspace by slug / ID
    const getWorkspaceRes = await get(`/projects/${foundNewProj.slug}`, userToken)
    assert(getWorkspaceRes.status === 200 && getWorkspaceRes.data.name === testProjectName, 'Normal reviewer can resolve new project workspace via GET /api/projects/:idOrSlug')

    // 5. Admin updates project -> Normal user sees update
    console.log('\n--- 5. Admin Updates Project -> Normal User Sees Update ---')
    const updatedName = `${testProjectName} (Updated)`
    const updateProjRes = await put(`/projects/${tempProjectId}`, {
      name: updatedName,
      matterName: 'Updated Test Matter',
    }, adminToken)
    assert(updateProjRes.status === 200, 'Admin updated project in MongoDB')

    const afterUpdateRes = await get('/projects', userToken)
    const foundUpdatedProj = afterUpdateRes.data.find(p => p._id === tempProjectId)
    assert(foundUpdatedProj?.name === updatedName, 'Normal reviewer sees updated project name in project list')

    // 6. Admin deletes temporary project -> Normal user no longer sees it
    console.log('\n--- 6. Admin Deletes Temporary Project -> Normal User Cleanup ---')
    const deleteProjRes = await del(`/projects/${tempProjectId}`, adminToken)
    assert(deleteProjRes.status === 200, 'Admin deleted temporary project')
    tempProjectId = null // already deleted

    const afterDeleteRes = await get('/projects', userToken)
    const foundDeletedProj = afterDeleteRes.data.find(p => p.name === updatedName || p.name === testProjectName)
    assert(!foundDeletedProj, 'Normal reviewer project list no longer contains deleted project')

    // 7. Unauthenticated request rejected
    console.log('\n--- 7. Unauthenticated Protection Check ---')
    const unauthRes = await get('/projects')
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/projects returns 401')

    // 8. Project Orchid integrity check
    console.log('\n--- 8. Project Orchid Integrity Check ---')
    const orchidRes = await get('/projects/project-orchid-6-7', userToken)
    assert(orchidRes.status === 200 && orchidRes.data.name.includes('Project Orchid'), 'Project Orchid metadata intact and untouched')

  } catch (err) {
    console.error('Test execution error:', err)
    failed++
  } finally {
    if (tempProjectId && adminToken) {
      await del(`/projects/${tempProjectId}`, adminToken).catch(() => {})
    }
  }

  console.log('\n=================================================================')
  console.log(`REVIEWER PROJECTS TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runReviewerProjectsTests()
