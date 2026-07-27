// app/api/v1/docs/route.ts
import { NextResponse } from "next/server";

// OpenAPI Specification
const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Reseller API",
    version: "1.0.0",
    description: "API for purchasing data and airtime bundles",
    contact: {
      name: "Support",
      email: "support@example.com",
    },
  },
  servers: [
    {
      url: "https://telco.opik.net/api/v1",
      description: "Production server",
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description:
          "Enter your API key here. Example: sk_live_xxxxxxxxxxxxxxxx",
      },
    },
    schemas: {
      Plan: {
        type: "object",
        properties: {
          id: { type: "string" },
          plan_id: { type: "integer" },
          network: {
            type: "string",
            enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"],
          },
          plan_type: { type: "string" },
          plan_name: { type: "string" },
          price: { type: "number" },
          validity: { type: "string" },
        },
      },
      Wallet: {
        type: "object",
        properties: {
          balance: { type: "number" },
          total_spent: { type: "number" },
          total_deposited: { type: "number" },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["deposit", "purchase_data", "purchase_airtime"],
          },
          amount: { type: "number" },
          status: {
            type: "string",
            enum: ["pending", "completed", "failed"],
          },
          reference: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      PurchaseDataRequest: {
        type: "object",
        required: ["planId", "phoneNumber"],
        properties: {
          planId: {
            type: "integer",
            description: "The plan_id from the plans endpoint",
          },
          phoneNumber: {
            type: "string",
            description: "Phone number to receive data",
          },
          network: {
            type: "string",
            enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"],
          },
        },
      },
      PurchaseAirtimeRequest: {
        type: "object",
        required: ["network", "phoneNumber", "amount"],
        properties: {
          network: {
            type: "string",
            enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"],
          },
          phoneNumber: {
            type: "string",
            description: "Phone number to receive airtime",
          },
          amount: { type: "number", description: "Airtime amount in Naira" },
        },
      },
      Webhook: {
        type: "object",
        required: ["url", "events"],
        properties: {
          url: { type: "string", format: "uri" },
          events: { type: "array", items: { type: "string" } },
          secret: {
            type: "string",
            description: "Optional webhook secret for signature verification",
          },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new API user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  companyName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Registration successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        api_key: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login to get API key",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        api_key: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/plans": {
      get: {
        summary: "Get all available data and airtime plans",
        tags: ["Plans"],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "network",
            in: "query",
            schema: {
              type: "string",
              enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"],
            },
            description: "Filter by network",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string", enum: ["data", "airtime"] },
            description: "Filter by category",
          },
        ],
        responses: {
          200: {
            description: "List of plans",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Plan" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/wallet": {
      get: {
        summary: "Get wallet balance",
        tags: ["Wallet"],
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: "Wallet balance",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Wallet" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/wallet/deposit": {
      post: {
        summary: "Create virtual account for deposit",
        tags: ["Wallet"],
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: "Virtual account created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        accounts: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              bankName: { type: "string" },
                              accountNumber: { type: "string" },
                              accountName: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/purchase/data": {
      post: {
        summary: "Purchase a data bundle",
        tags: ["Purchases"],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PurchaseDataRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Purchase successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        reference: { type: "string" },
                        plan_name: { type: "string" },
                        amount: { type: "number" },
                        phone_number: { type: "string" },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/purchase/airtime": {
      post: {
        summary: "Purchase airtime",
        tags: ["Purchases"],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PurchaseAirtimeRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Purchase successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        reference: { type: "string" },
                        amount: { type: "number" },
                        phone_number: { type: "string" },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/transactions": {
      get: {
        summary: "Get transaction history",
        tags: ["Transactions"],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
            description: "Number of transactions to return",
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
            description: "Pagination offset",
          },
        ],
        responses: {
          200: {
            description: "Transaction history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Transaction" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/webhooks": {
      get: {
        summary: "List webhooks",
        tags: ["Webhooks"],
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: "List of webhooks",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Webhook" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create webhook",
        tags: ["Webhooks"],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Webhook" },
            },
          },
        },
        responses: {
          200: {
            description: "Webhook created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Webhook" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Serve Swagger UI with API key support
export async function GET() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>API Documentation - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const spec = ${JSON.stringify(openApiSpec)};
      
      // ✅ Load saved API key from localStorage
      const savedApiKey = localStorage.getItem('api_key');
      
      const ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        // ✅ Enable Authorize button with saved key
        authorizations: savedApiKey ? {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            value: savedApiKey
          }
        } : undefined
      });
      
      window.ui = ui;
      
      // ✅ Save API key when user authorizes
      const originalAuthorize = ui.authActions.authorize;
      ui.authActions.authorize = function(auth) {
        const apiKey = auth?.ApiKeyAuth?.value;
        if (apiKey) {
          localStorage.setItem('api_key', apiKey);
        }
        return originalAuthorize.apply(this, arguments);
      };
      
      // ✅ Clear API key when user logs out
      const originalLogout = ui.authActions.logout;
      ui.authActions.logout = function() {
        localStorage.removeItem('api_key');
        return originalLogout.apply(this, arguments);
      };
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
