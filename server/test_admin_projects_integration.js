// Integration tests for Admin Step 2: Project Management APIs

const BASE_URL = 'http://localhost:5050/api'

async function runTests() {
  console.log('=================================================================')
  console.log('STARTING ADMIN STEP 2 PROJECT MANAGEMENT API TESTS')
  console.log('=================================================================\n')

  const results = []

  function logTest(num, name, pass, actual, expected) {
    results.push({ num, name, status: pass ? 'PASS' : 'FAIL', actual, expected })
    console.log(`[TEST ${num}] ${name}: ${pass ? 'PASS' : 'FAIL'}`)
    console.log(`   Expected: ${expected}`)
    console.log(`   Actual:   ${actual}\n`)
  }

  const get = (url) => fetch(`${BASE_URL}${url}`).then(async (r) => ({ status: r.status, data: await r.json() }))
  const post = (url, body) => fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, data: await r.json() }))
  const put = (url, body) => fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, data: await r.json() }))
  const del = (url) => fetch(`${BASE_URL}${url}`, { method: 'DELETE' }).then(async (r) => ({ status: r.status, data: await r.json() }))

  try {
    // 1. GET all projects
    const t1 = await get('/projects')
    const pass1 = t1.status === 200 && Array.isArray(t1.data) && t1.data.length > 0
    logTest(1, 'Fetch all projects for Admin project list', pass1, `Status ${t1.status}, count=${t1.data?.length}`, 'Status 200, array of projects')

    // 2. CREATE project
    const suffix = Date.now()
    const newProjPayload = {
      name: `Admin_Proj_Test_${suffix}`,
      slug: `admin-proj-test-${suffix}`,
      matterName: 'Investigation Alpha',
      matterNumber: 'MTR-9001',
      clientNumber: 'CL-8800',
      description: 'Admin created project description',
      status: 'Active'
    }
    const t2 = await post('/projects', newProjPayload)
    const pass2 = t2.status === 201 && t2.data.name === newProjPayload.name && t2.data.slug === newProjPayload.slug
    logTest(2, 'Create new project via POST /api/projects', pass2, `Status ${t2.status}, created ID=${t2.data._id}`, 'Status 201, created project returned')

    const createdProject = t2.data

    // 3. Reject duplicate project name
    const t3 = await post('/projects', newProjPayload)
    const pass3 = t3.status === 409
    logTest(3, 'Reject duplicate project name', pass3, `Status ${t3.status} (Error: "${t3.data?.error}")`, 'Status 409 Conflict')

    // 4. Reject missing project name
    const t4 = await post('/projects', { matterName: 'No Name Proj' })
    const pass4 = t4.status === 400
    logTest(4, 'Reject project creation without name', pass4, `Status ${t4.status} (Error: "${t4.data?.error}")`, 'Status 400 Bad Request')

    // 5. UPDATE project
    const updatePayload = {
      name: `Admin_Proj_Test_Updated_${suffix}`,
      matterName: 'Investigation Alpha Updated',
      status: 'Pending'
    }
    const t5 = await put(`/projects/${createdProject._id}`, updatePayload)
    const pass5 = t5.status === 200 && t5.data.name === updatePayload.name && t5.data.status === 'Pending'
    logTest(5, 'Update project metadata via PUT /api/projects/:id', pass5, `Status ${t5.status}, updated name="${t5.data?.name}", status="${t5.data?.status}"`, 'Status 200, updated project returned')

    // 6. DELETE project
    const t6 = await del(`/projects/${createdProject._id}`)
    const t6Verify = await get(`/projects/${createdProject._id}`)
    const pass6 = t6.status === 200 && t6Verify.status === 404
    logTest(6, 'Delete project via DELETE /api/projects/:id', pass6, `Delete status ${t6.status}, subsequent GET status ${t6Verify.status}`, 'Status 200, project removed from DB (404)')

    // 7. Verify primary demo project remains untouched
    const t7 = await get('/projects/project-orchid-6-7')
    const pass7 = t7.status === 200 && t7.data.slug === 'project-orchid-6-7'
    logTest(7, 'Verify primary demo project remains untouched', pass7, `Status ${t7.status}, name="${t7.data?.name}"`, 'Status 200, Project Orchid (6-7) intact')

    // Summary
    const totalPassed = results.filter(r => r.status === 'PASS').length
    console.log('=================================================================')
    console.log(`ADMIN STEP 2 TEST RESULTS: ${totalPassed} / ${results.length} PASSED`)
    console.log('=================================================================')

  } catch (err) {
    console.error('Test execution error:', err)
  }
}

runTests()
