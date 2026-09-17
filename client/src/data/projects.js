export const projects = [
  {
    id: 'project-orchid-6-7',
    name: 'Project Orchid (6-7)',
    matterName: 'Orchid',
    matterNumber: 'MTR-0067',
    status: 'Active',
    clientNumber: 'CL-1042',
    description: 'Project Orchid review workspace',
  },
  {
    id: 'project-orchid-special-analysis',
    name: 'Project Orchid - Special Analysis',
    matterName: 'Orchid Special Analysis',
    matterNumber: 'MTR-0067-SA',
    status: 'Active',
    clientNumber: 'CL-1042',
    description: 'Special analysis workspace',
  },
  {
    id: 'project-alpha',
    name: 'Project Alpha',
    matterName: 'Alpha',
    matterNumber: 'MTR-0101',
    status: 'Active',
    clientNumber: 'CL-1088',
    description: 'Project Alpha review workspace',
  },
  {
    id: 'project-beta',
    name: 'Project Beta',
    matterName: 'Beta',
    matterNumber: 'MTR-0102',
    status: 'Active',
    clientNumber: 'CL-1091',
    description: 'Project Beta review workspace',
  },
]

export function getProject(projectId) {
  return projects.find((project) => project.id === projectId)
}
