/**
 * Diplomacy Portal Data Integration
 * Loads missions, treaties, delegations, and documents from backend API
 * Requires admin authentication for create/update operations
 */

const API_BASE = '';  // relative to origin

// ========== Authentication Helpers ==========
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  if (!token) return {};
  const credentials = localStorage.getItem('adminCredentials');
  if (!credentials) return { 'Authorization': `Bearer ${token}` };
  return {
    'Authorization': `Basic ${credentials}`,
    'X-Token': token
  };
}

// ========== Missions ==========
async function loadMissions(region = null) {
  try {
    const url = region 
      ? `${API_BASE}/api/diplomacy/missions?region=${encodeURIComponent(region)}`
      : `${API_BASE}/api/diplomacy/missions`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load missions: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error loading missions:', error);
    return [];
  }
}

async function createMission(data) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to create mission: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error creating mission:', error);
    throw error;
  }
}

async function updateMission(id, data) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/missions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to update mission: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error updating mission:', error);
    throw error;
  }
}

async function deleteMission(id) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/missions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to delete mission: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error deleting mission:', error);
    throw error;
  }
}

// ========== Treaties ==========
async function loadTreaties(status = null) {
  try {
    const url = status
      ? `${API_BASE}/api/diplomacy/treaties?status=${encodeURIComponent(status)}`
      : `${API_BASE}/api/diplomacy/treaties`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load treaties: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error loading treaties:', error);
    return [];
  }
}

async function createTreaty(data) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/treaties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to create treaty: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error creating treaty:', error);
    throw error;
  }
}

async function updateTreaty(id, data) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/treaties/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to update treaty: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error updating treaty:', error);
    throw error;
  }
}

async function deleteTreaty(id) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/treaties/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to delete treaty: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error deleting treaty:', error);
    throw error;
  }
}

// ========== Delegations ==========
async function loadDelegations() {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/delegations`);
    if (!response.ok) throw new Error(`Failed to load delegations: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error loading delegations:', error);
    return [];
  }
}

async function createDelegation(data) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/delegations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to create delegation: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error creating delegation:', error);
    throw error;
  }
}

async function updateDelegation(id, data) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/delegations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to update delegation: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error updating delegation:', error);
    throw error;
  }
}

async function deleteDelegation(id) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/delegations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to delete delegation: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error deleting delegation:', error);
    throw error;
  }
}

// ========== Documents ==========
async function loadDocuments(category = null) {
  try {
    const url = category
      ? `${API_BASE}/api/diplomacy/documents?category=${encodeURIComponent(category)}`
      : `${API_BASE}/api/diplomacy/documents`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load documents: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error loading documents:', error);
    return [];
  }
}

async function createDocument(data) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to create document: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
}

async function updateDocument(id, data) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/documents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to update document: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
}

async function deleteDocument(id) {
  try {
    const response = await fetch(`${API_BASE}/api/diplomacy/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to delete document: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

// ========== UI Rendering Helpers ==========
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMissionType(type) {
  const mapping = {
    EMBASSY: 'Embassy',
    HIGH_COMMISSION: 'High Commission',
    CONSULATE: 'Consulate',
    PERMANENT_MISSION: 'Permanent Mission',
    HONORARY_CONSULATE: 'Honorary Consulate'
  };
  return mapping[type] || type;
}

function formatTreatyStatus(status) {
  const mapping = {
    NEGOTIATION: 'Negotiation',
    SIGNED: 'Signed',
    RATIFIED: 'Ratified',
    IN_REVIEW: 'In Review',
    IMPLEMENTATION: 'Implementation',
    EXPIRED: 'Expired'
  };
  return mapping[status] || status;
}

function formatDelegationType(type) {
  const mapping = {
    TRADE_MISSION: 'Trade Mission',
    STATE_VISIT: 'State Visit',
    CONFERENCE: 'Conference',
    WORKING_VISIT: 'Working Visit',
    FACT_FINDING: 'Fact-Finding',
    MULTILATERAL: 'Multilateral'
  };
  return mapping[type] || type;
}

function formatDelegationStatus(status) {
  const mapping = {
    PLANNING: 'Planning',
    CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  };
  return mapping[status] || status;
}

function formatDocumentCategory(category) {
  const mapping = {
    BRIEFING_NOTE: 'Briefing Note',
    PROTOCOL_GUIDE: 'Protocol Guide',
    TREATY_DRAFT: 'Treaty Draft',
    DIPLOMATIC_NOTE: 'Diplomatic Note',
    SPEECH: 'Speech',
    REPORT: 'Report'
  };
  return mapping[category] || category;
}

function formatClassification(classification) {
  const mapping = {
    PUBLIC: 'Public',
    RESTRICTED: 'Restricted',
    CONFIDENTIAL: 'Confidential',
    SECRET: 'Secret'
  };
  return mapping[classification] || classification;
}

// Export functions for use in HTML pages
if (typeof window !== 'undefined') {
  window.DiplomacyAPI = {
    // Missions
    loadMissions,
    createMission,
    updateMission,
    deleteMission,
    
    // Treaties
    loadTreaties,
    createTreaty,
    updateTreaty,
    deleteTreaty,
    
    // Delegations
    loadDelegations,
    createDelegation,
    updateDelegation,
    deleteDelegation,
    
    // Documents
    loadDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    
    // Formatters
    formatDate,
    formatMissionType,
    formatTreatyStatus,
    formatDelegationType,
    formatDelegationStatus,
    formatDocumentCategory,
    formatClassification
  };
}
