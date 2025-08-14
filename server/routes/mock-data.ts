import { RequestHandler } from "express";

// Mock data for development when ServeManager isn't configured
const mockJobs = [
  {
    id: "20527876",
    job_number: "20527876",
    client: {
      id: "client1",
      name: "Pronto Process Service",
      company: "Pronto Process Service"
    },
    recipient: {
      name: "Robert Eskridge",
      address: {
        street: "1920 WILWOOD DRIVE",
        city: "ROUND ROCK",
        state: "TX",
        zip: "78681",
        full_address: "1920 WILWOOD DRIVE, ROUND ROCK TX 78681"
      }
    },
    status: "pending" as const,
    priority: "routine" as const,
    server: {
      id: "server1",
      name: "Adam Darley"
    },
    due_date: null,
    created_date: "2024-01-15T10:00:00Z",
    amount: 50.00,
    description: "Service of Process - Divorce Papers",
    service_type: "Service"
  },
  {
    id: "20527766",
    job_number: "20527766", 
    client: {
      id: "client1",
      name: "Pronto Process Service",
      company: "Pronto Process Service"
    },
    recipient: {
      name: "MINJUNG KWUN",
      address: {
        street: "291 LOCKHART LOOP",
        city: "GEORGETOWN",
        state: "TX", 
        zip: "78628",
        full_address: "291 LOCKHART LOOP, GEORGETOWN TX 78628"
      }
    },
    status: "pending" as const,
    priority: "routine" as const,
    server: {
      id: "server1",
      name: "Adam Darley"
    },
    due_date: null,
    created_date: "2024-01-14T09:30:00Z",
    amount: 50.00,
    description: "Subpoena Service",
    service_type: "Service"
  },
  {
    id: "20508743",
    job_number: "20508743",
    client: {
      id: "client2", 
      name: "Kerr Civil Process Service",
      company: "Kerr Civil Process Service"
    },
    recipient: {
      name: "WILLIAMSON CENTRAL APPRAISAL DISTRICT",
      address: {
        street: "625 FM 1460",
        city: "Georgetown",
        state: "TX",
        zip: "78626", 
        full_address: "625 FM 1460, Georgetown TX 78626"
      }
    },
    status: "pending" as const,
    priority: "routine" as const,
    server: null,
    due_date: "2024-08-20",
    created_date: "2024-01-10T08:15:00Z",
    amount: 0.00,
    description: "Court Papers - Personal Injury",
    service_type: "Service"
  }
];

const mockClients = [
  {
    id: "client1",
    name: "Pronto Process Service",
    company: "Pronto Process Service", 
    email: "info@prontoprocess.com",
    phone: "(512) 555-0123",
    address: {
      street: "123 Main St",
      city: "Austin", 
      state: "TX",
      zip: "78701"
    },
    created_date: "2023-06-15T00:00:00Z",
    active: true
  },
  {
    id: "client2",
    name: "Kerr Civil Process Service", 
    company: "Kerr Civil Process Service",
    email: "contact@kerrprocess.com",
    phone: "(512) 555-0456",
    address: {
      street: "456 Oak Ave",
      city: "Georgetown",
      state: "TX", 
      zip: "78626"
    },
    created_date: "2023-08-20T00:00:00Z",
    active: true
  }
];

const mockServers = [
  {
    id: "server1",
    name: "Adam Darley",
    email: "adam@serveportal.com",
    phone: "(512) 555-0789",
    license_number: "TX12345",
    active: true,
    territories: ["Austin", "Georgetown", "Round Rock"],
    created_date: "2023-01-15T00:00:00Z"
  }
];

const mockInvoices = [
  {
    id: "inv001",
    invoice_number: "INV-2024-001",
    client: {
      id: "client1",
      name: "Pronto Process Service",
      company: "Pronto Process Service"
    },
    jobs: [
      { id: "20527876", job_number: "20527876", amount: 50.00 },
      { id: "20527766", job_number: "20527766", amount: 50.00 }
    ],
    status: "sent" as const,
    subtotal: 100.00,
    tax: 8.25,
    total: 108.25,
    created_date: "2024-01-15T00:00:00Z",
    due_date: "2024-02-14T00:00:00Z"
  },
  {
    id: "inv002",
    invoice_number: "INV-2024-002",
    client: {
      id: "client2",
      name: "Kerr Civil Process Service",
      company: "Kerr Civil Process Service"
    },
    jobs: [
      { id: "20508743", job_number: "20508743", amount: 0.00 }
    ],
    status: "draft" as const,
    subtotal: 0.00,
    tax: 0.00,
    total: 0.00,
    created_date: "2024-01-10T00:00:00Z",
    due_date: "2024-02-09T00:00:00Z"
  }
];

export const getMockJobs: RequestHandler = (req, res) => {
  const { limit = '50', offset = '0' } = req.query;
  
  res.json({
    jobs: mockJobs,
    total: mockJobs.length,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
};

export const getMockClients: RequestHandler = (req, res) => {
  const { limit = '100', offset = '0' } = req.query;
  
  res.json({
    clients: mockClients,
    total: mockClients.length,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
};

export const getMockServers: RequestHandler = (req, res) => {
  const { limit = '100', offset = '0' } = req.query;
  
  res.json({
    servers: mockServers,
    total: mockServers.length,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
};

export const getMockInvoices: RequestHandler = (req, res) => {
  const { limit = '100', offset = '0' } = req.query;
  
  res.json({
    invoices: mockInvoices,
    total: mockInvoices.length,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
};
