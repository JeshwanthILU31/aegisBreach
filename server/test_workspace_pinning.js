// AegisBreach: Workspace Pinning Functionality & User Isolation Test Suite
import assert from 'assert'

console.log('================================================================================')
console.log('RUNNING WORKSPACE PINNING FUNCTIONALITY & PERSISTENCE TEST SUITE')
console.log('================================================================================')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  [FAIL] ${name} -> ${err.message}`)
    failed++
  }
}

// 1. Mock Data Setup
const mockProjects = [
  { _id: 'proj_01', slug: 'project-a', name: 'Project A', caseArtifactId: 16160833, matterName: 'Alpha Matter', matterNumber: 'M-100', status: 'Active', clientNumber: 'C-01' },
  { _id: 'proj_02', slug: 'project-b', name: 'Project B', caseArtifactId: 16160832, matterName: 'Beta Matter', matterNumber: 'M-200', status: 'Pending', clientNumber: 'C-02' },
  { _id: 'proj_03', slug: 'project-orchid', name: 'Project Orchid (6-7)', caseArtifactId: 13956925, matterName: 'Orion Matter', matterNumber: 'M-300', status: 'Active', clientNumber: 'C-03' },
  { _id: 'proj_04', slug: 'aegisbreach-test-02', name: 'AegisBreach Reviewer Test 02', caseArtifactId: 11420698, matterName: 'Gamma Matter', matterNumber: 'M-400', status: 'Archived', clientNumber: 'C-04' }
]

// Mock LocalStorage
class MockLocalStorage {
  constructor() {
    this.store = {}
  }
  getItem(key) {
    return this.store[key] || null
  }
  setItem(key, value) {
    this.store[key] = String(value)
  }
  removeItem(key) {
    delete this.store[key]
  }
  clear() {
    this.store = {}
  }
}

const mockStorage = new MockLocalStorage()

// Core Logic Helpers replicating Projects.jsx logic
function getStorageKey(user) {
  const userId = user?.id || user?._id || 'guest'
  return `aegisbreach_pinned_workspaces_${userId}`
}

function getPinnedIds(user, storage = mockStorage) {
  try {
    const key = getStorageKey(user)
    const stored = storage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function togglePin(projectId, user, storage = mockStorage) {
  const sId = String(projectId)
  const current = getPinnedIds(user, storage)
  const next = current.includes(sId) ? current.filter((id) => id !== sId) : [...current, sId]
  storage.setItem(getStorageKey(user), JSON.stringify(next))
  return next
}

function pruneStalePins(pinnedIds, liveProjects, user, storage = mockStorage) {
  const validIds = new Set(liveProjects.map((p) => String(p._id || p.id || p.slug)))
  const cleaned = pinnedIds.filter((id) => validIds.has(String(id)))
  if (cleaned.length !== pinnedIds.length) {
    storage.setItem(getStorageKey(user), JSON.stringify(cleaned))
  }
  return cleaned
}

function filterProjects(projects, query = '', columnFilters = {}) {
  return projects.filter((project, index) => {
    const artifactId = String(project.caseArtifactId || 11420698 + index)
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

    if (columnFilters.caseArtifactId) {
      const cId = columnFilters.caseArtifactId.trim().toLowerCase()
      if (!artifactId.toLowerCase().includes(cId)) return false
    }
    if (columnFilters.name) {
      const nameF = columnFilters.name.trim().toLowerCase()
      if (!project.name || !project.name.toLowerCase().includes(nameF)) return false
    }
    if (columnFilters.matterName) {
      const mF = columnFilters.matterName.trim().toLowerCase()
      if (!project.matterName || !project.matterName.toLowerCase().includes(mF)) return false
    }
    if (columnFilters.matterNumber) {
      const mnF = columnFilters.matterNumber.trim().toLowerCase()
      if (!project.matterNumber || !project.matterNumber.toLowerCase().includes(mnF)) return false
    }
    if (columnFilters.status && columnFilters.status !== 'All' && columnFilters.status !== '(All)') {
      if (!project.status || project.status.toLowerCase() !== columnFilters.status.toLowerCase()) return false
    }
    if (columnFilters.clientNumber) {
      const cnF = columnFilters.clientNumber.trim().toLowerCase()
      if (!project.clientNumber || !project.clientNumber.toLowerCase().includes(cnF)) return false
    }
    return true
  })
}

function computePinnedAndSorted(projects, query = '', columnFilters = {}, pinnedIds = []) {
  const filtered = filterProjects(projects, query, columnFilters)
  const matchingPinned = filtered.filter((p) => pinnedIds.includes(String(p._id || p.id || p.slug)))
  
  const pinned = []
  const unpinned = []
  filtered.forEach((p) => {
    const sId = String(p._id || p.id || p.slug)
    if (pinnedIds.includes(sId)) {
      pinned.push(p)
    } else {
      unpinned.push(p)
    }
  })
  return { matchingPinned, sortedFiltered: [...pinned, ...unpinned] }
}

// -----------------------------------------------------------------------------
// Test 1: Initial empty state
// -----------------------------------------------------------------------------
test('Initial state: no workspaces pinned returns empty list', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  const pins = getPinnedIds(user1)
  assert.deepStrictEqual(pins, [])
})

// -----------------------------------------------------------------------------
// Test 2: Pin a single workspace
// -----------------------------------------------------------------------------
test('Pin Project Orchid (proj_03) adds it to pinned list', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  const updated = togglePin('proj_03', user1)
  assert.strictEqual(updated.length, 1)
  assert.strictEqual(updated[0], 'proj_03')
  assert.deepStrictEqual(getPinnedIds(user1), ['proj_03'])
})

// -----------------------------------------------------------------------------
// Test 3: Unpin workspace
// -----------------------------------------------------------------------------
test('Toggling pin on already-pinned workspace unpins it', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  const updated = togglePin('proj_03', user1)
  assert.strictEqual(updated.length, 0)
  assert.deepStrictEqual(getPinnedIds(user1), [])
})

// -----------------------------------------------------------------------------
// Test 4: Pin multiple workspaces
// -----------------------------------------------------------------------------
test('Pin multiple workspaces (Project Orchid and AegisBreach Test 02)', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  togglePin('proj_03', user1)
  const updated = togglePin('proj_04', user1)
  assert.strictEqual(updated.length, 2)
  assert(updated.includes('proj_03'))
  assert(updated.includes('proj_04'))
})

// -----------------------------------------------------------------------------
// Test 5: Sorted order has pinned workspaces first
// -----------------------------------------------------------------------------
test('Sorted filtered workspace list places pinned workspaces first', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  const pins = getPinnedIds(user1) // ['proj_03', 'proj_04']
  const { sortedFiltered, matchingPinned } = computePinnedAndSorted(mockProjects, '', {}, pins)
  
  assert.strictEqual(matchingPinned.length, 2)
  assert.strictEqual(matchingPinned[0]._id, 'proj_03')
  assert.strictEqual(matchingPinned[1]._id, 'proj_04')
  
  assert.strictEqual(sortedFiltered[0]._id, 'proj_03')
  assert.strictEqual(sortedFiltered[1]._id, 'proj_04')
  assert.strictEqual(sortedFiltered[2]._id, 'proj_01')
  assert.strictEqual(sortedFiltered[3]._id, 'proj_02')
})

// -----------------------------------------------------------------------------
// Test 6: Global search filters both normal list and pinned section
// -----------------------------------------------------------------------------
test('Global search query filters matching pinned favorites appropriately', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  const pins = getPinnedIds(user1) // ['proj_03', 'proj_04']
  
  // Search for 'Orchid'
  const { sortedFiltered, matchingPinned } = computePinnedAndSorted(mockProjects, 'orchid', {}, pins)
  assert.strictEqual(matchingPinned.length, 1)
  assert.strictEqual(matchingPinned[0].name, 'Project Orchid (6-7)')
  assert.strictEqual(sortedFiltered.length, 1)
  assert.strictEqual(sortedFiltered[0].name, 'Project Orchid (6-7)')
})

// -----------------------------------------------------------------------------
// Test 7: Column filter on Status respects pinned section
// -----------------------------------------------------------------------------
test('Column filter on Status filters matching pinned workspaces', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  const pins = getPinnedIds(user1) // ['proj_03' (Active), 'proj_04' (Archived)]
  
  // Filter for Active
  const { sortedFiltered, matchingPinned } = computePinnedAndSorted(mockProjects, '', { status: 'Active' }, pins)
  assert.strictEqual(matchingPinned.length, 1)
  assert.strictEqual(matchingPinned[0]._id, 'proj_03')
  assert.strictEqual(sortedFiltered.length, 2) // proj_03 and proj_01
  assert.strictEqual(sortedFiltered[0]._id, 'proj_03')
  assert.strictEqual(sortedFiltered[1]._id, 'proj_01')
})

// -----------------------------------------------------------------------------
// Test 8: User isolation (user1 vs admin vs user2)
// -----------------------------------------------------------------------------
test('User isolation: User 2 and Admin have independent pin preferences', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  const user2 = { id: 'usr_02', username: 'user2' }
  const admin = { id: 'usr_admin', username: 'admin' }
  
  // user1 already has ['proj_03', 'proj_04']
  assert.strictEqual(getPinnedIds(user2).length, 0)
  assert.strictEqual(getPinnedIds(admin).length, 0)
  
  // Admin pins proj_01
  togglePin('proj_01', admin)
  assert.deepStrictEqual(getPinnedIds(admin), ['proj_01'])
  assert.deepStrictEqual(getPinnedIds(user1), ['proj_03', 'proj_04'])
  assert.deepStrictEqual(getPinnedIds(user2), [])
})

// -----------------------------------------------------------------------------
// Test 9: Stale pinned project pruning
// -----------------------------------------------------------------------------
test('Stale deleted project IDs are automatically pruned when live list loads', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  // Simulate user1 having a deleted project ID 'proj_deleted_99'
  mockStorage.setItem(getStorageKey(user1), JSON.stringify(['proj_03', 'proj_deleted_99']))
  
  const rawPins = getPinnedIds(user1)
  assert.strictEqual(rawPins.length, 2)
  
  const pruned = pruneStalePins(rawPins, mockProjects, user1)
  assert.deepStrictEqual(pruned, ['proj_03'])
  assert.deepStrictEqual(getPinnedIds(user1), ['proj_03'])
})

// -----------------------------------------------------------------------------
// Test 10: Stable identifier check (MongoDB _id or slug)
// -----------------------------------------------------------------------------
test('Pins use stable identifiers (_id or slug), never human display names', () => {
  const user1 = { id: 'usr_01', username: 'user1' }
  const pins = getPinnedIds(user1)
  pins.forEach((id) => {
    assert(!id.includes(' '), `Pinned ID "${id}" must be a stable identifier, not a display name`)
  })
})

console.log('================================================================================')
console.log(`WORKSPACE PINNING TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`)
console.log('================================================================================')

if (failed > 0) process.exit(1)
