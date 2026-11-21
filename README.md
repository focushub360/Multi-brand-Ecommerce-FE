# GROVE – Multi-Brand E-Commerce Frontend

## 1. Project Overview

GROVE is a multi-brand e-commerce marketplace that allows customers to explore products from different categories such as Agriculture, Electronics, Automotive, and Groceries.

The application also provides dedicated Admin and Dealer dashboards for marketplace management.

## 2. Technologies Used

- React 19
- Vite 8
- JavaScript
- Tailwind CSS 4
- React Router DOM 7
- Lucide React

## 3. Features

- Multi-category product browsing
- Agriculture products
- Electronics products
- Automotive products
- Groceries section
- Customer login and signup
- Shopping cart
- Wishlist
- Customer account and orders
- Admin dashboard
- Dealer dashboard
- Product and inventory management
- API integration

## 4. Project Structure

```text
src/
├── assets/
├── components/
│   ├── admin/
│   ├── agriculture/
│   ├── auth/
│   ├── automotive/
│   ├── customer/
│   ├── dealer/
│   ├── electronics/
│   └── groceries/
├── constants/
├── pages/
│   ├── admin/
│   ├── customer/
│   └── dealer/
├── services/
└── utils/
```

## 5. Prerequisites

Install the following before running the project:

- Node.js
- npm
- Git
- Visual Studio Code (recommended)

## 6. Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/focushub360/Multi-brand-Ecommerce-Frontend.git
```

### Step 2: Navigate to Project

```bash
cd Multi-brand-Ecommerce-Frontend
```

### Step 3: Install Dependencies

```bash
npm install
```

## 7. Environment Configuration

Create a `.env` file in the project root.

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Replace the example URL with the actual backend API URL.

The API client is configured in:

`src/services/apiClient.js`

Default API configuration:

```javascript
import.meta.env.VITE_API_URL || '/api/v1'
```

## 8. Run the Frontend

Start the development server:

```bash
npm run dev
```

Open the URL displayed in the terminal.

Default development URL:

`http://localhost:5173`

## 9. Build for Production

```bash
npm run build
```

## 10. Preview Production Build

```bash
npm run preview
```

## 11. Available Scripts

| Command | Description |
|---|---|
| npm run dev | Start development server |
| npm run build | Build production application |
| npm run preview | Preview production build |
| npm run lint | Run Oxlint |

## 12. Backend Integration

The frontend communicates with backend services through the API client.

- API configuration: `src/services/apiClient.js`
- API base URL: Configured using `VITE_API_URL`
- Default API path: `/api/v1`

The actual backend URL and available endpoints must be configured according to the backend project.

## 13. Repository

GitHub Repository:

https://github.com/focushub360/Multi-brand-Ecommerce-Frontend

## 14. Notes

- This repository contains the frontend application.
- Backend services are maintained separately.
- API functionality requires a configured backend server.
- Never commit passwords, API secrets, or private environment variables.
