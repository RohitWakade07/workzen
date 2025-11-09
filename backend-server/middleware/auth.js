import jwt from "jsonwebtoken"
import pool from "../config/database.js"

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

/**
 * Middleware to authenticate JWT token and attach user to request
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ detail: "Missing authorization header" })
  }

  const token = authHeader.split(" ")[1]
  if (!token) {
    return res.status(401).json({ detail: "Missing token" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    console.log("[v0] Auth: Token validation failed", error.message)
    return res.status(401).json({ detail: "Invalid or expired token" })
  }
}

/**
 * Middleware to require specific role(s)
 * Usage: requireRole(['admin', 'hr_officer'])
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ detail: "Authentication required" })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        detail: `Access denied. Required role: ${allowedRoles.join(' or ')}, your role: ${req.user.role}` 
      })
    }

    next()
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req, res, next) {
  return requireRole(['admin'])(req, res, next)
}

/**
 * Middleware to require HR or Admin role
 */
export function requireHROrAdmin(req, res, next) {
  return requireRole(['hr_officer', 'admin'])(req, res, next)
}

/**
 * Middleware to require Payroll Officer or Admin role
 */
export function requirePayrollOrAdmin(req, res, next) {
  return requireRole(['payroll_officer', 'admin'])(req, res, next)
}

/**
 * Middleware to require HR, Payroll Officer or Admin role
 */
export function requireHRPayrollOrAdmin(req, res, next) {
  return requireRole(['hr_officer', 'payroll_officer', 'admin'])(req, res, next)
}

/**
 * Middleware to check if user can manage employees
 * HR can manage employees with role "employee" only
 * Admin can manage all employees
 */
export async function canManageEmployee(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ detail: "Authentication required" })
  }

  // Admin can manage all employees
  if (req.user.role === 'admin') {
    req.canManageAllRoles = true
    return next()
  }

  // HR can only manage employees with role "employee"
  if (req.user.role === 'hr_officer') {
    req.canManageAllRoles = false
    
    // For POST/PUT requests, check the role being assigned
    if ((req.method === 'POST' || req.method === 'PUT') && req.body.role) {
      if (req.body.role !== 'employee') {
        return res.status(403).json({ 
          detail: `HR Officers can only create/update employees with role "employee". Cannot assign role: ${req.body.role}` 
        })
      }
    }
    
    return next()
  }

  // Other roles cannot manage employees
  return res.status(403).json({ 
    detail: "Access denied. Only HR Officers and Admins can manage employees." 
  })
}

/**
 * Middleware to filter employees based on user role
 * HR can only see employees with role "employee"
 * Admin can see all employees
 */
export function filterEmployeesByRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ detail: "Authentication required" })
  }

  // Admin can see all employees
  if (req.user.role === 'admin') {
    req.employeeRoleFilter = null // No filter
  } else if (req.user.role === 'hr_officer') {
    // HR can only see employees with role "employee"
    req.employeeRoleFilter = 'employee'
  } else {
    // Other roles can only see their own data
    req.employeeRoleFilter = 'self'
  }

  next()
}
