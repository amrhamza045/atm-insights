# Executive Dashboard - Data Requirements & Metrics Guide

## Overview
The Executive Dashboard provides a comprehensive 360° business view across 20+ analytical modules. Each section contains graphs and metrics that require specific data entries to function accurately. This document outlines what data is needed for each metric.

---

## 📊 1. Executive Summary Section
**Purpose:** High-level KPIs and key metrics at a glance

### Metrics Included:

#### Revenue & Profitability
- **Total Revenue (YTD & MTD)**
  - Shows: Sum of all completed orders
  - Data Needed: Orders with status "paid" or "completed", including tax and service charges
  - Critical Fields: `order.total`, `order.status`, `order.created_date`, `order.branch_id`
  - Quality Check: Verify all orders have amounts and payment status

- **Profit Margin**
  - Shows: (Revenue - COGS) / Revenue %
  - Data Needed: Food costs, waste declarations, operating expenses
  - Critical Fields: `MenuItem.total_cost`, `InventoryItem.current_stock`, `WasteDeclaration.cost_impact`
  - Quality Check: Update food cost calculations monthly

- **Average Order Value**
  - Shows: Mean transaction amount
  - Data Needed: All orders with totals
  - Critical Fields: `order.total`, `order.id`
  - Quality Check: Filter out cancelled orders

#### Operations
- **Total Orders (YTD & MTD)**
  - Shows: Order volume and trends
  - Data Needed: Order count by status
  - Critical Fields: `order.status`, `order.created_date`
  - Quality Check: Ensure all orders are recorded

- **Active Branches**
  - Shows: Number of operational branches
  - Data Needed: Branches with `is_active = true`
  - Critical Fields: `Branch.is_active`
  - Quality Check: Update branch status when opening/closing

#### Customer Metrics
- **Registered Clients**
  - Shows: Active loyalty program members
  - Data Needed: Client count with `loyalty_program_enrolled = true` and recent purchase
  - Critical Fields: `Client.loyalty_program_enrolled`, `Client.created_date`
  - Quality Check: Monitor enrollment conversion rates

- **Guest vs Member Orders**
  - Shows: Distribution of loyalty vs non-loyalty orders
  - Data Needed: Orders linked to `client_id` vs null
  - Critical Fields: `Order.customer_id`, `Order.created_date`
  - Quality Check: Encourage member registration at checkout

#### Financial Position
- **Available Payout Balance**
  - Shows: Total withdrawable funds for members
  - Data Needed: Sum of `Client.available_payout` across all clients
  - Critical Fields: `Client.available_payout`, `Payout.status`
  - Quality Check: Reconcile with payout history monthly

- **Pending Payouts**
  - Shows: Requests awaiting approval/processing
  - Data Needed: Payout records with status "pending"
  - Critical Fields: `Payout.status`, `Payout.amount`, `Payout.requested_date`
  - Quality Check: Process pending payouts within SLA

---

## 💰 2. Sales & Revenue Section

### Revenue Charts

#### 30-Day Revenue Trend
- **What it shows:** Daily revenue movement over last 30 days with trend line
- **Data Required:**
  - Order creation dates and amounts
  - Order status (paid/completed only)
  - Tax and service charges included in total
- **Data Quality Checklist:**
  - ✓ All orders have `created_date` in correct format
  - ✓ Orders sorted by date
  - ✓ Total amount includes all fees
  - ✓ Excludes cancelled orders

#### Payment Method Distribution
- **What it shows:** Revenue by payment channel (cash, visa, wallet, etc.)
- **Data Required:**
  - `order.payment_method` recorded for every order
  - Amount paid via each method (for split payments)
  - Secondary payment methods tracked
- **Data Quality Checklist:**
  - ✓ Payment method enum values standardized
  - ✓ Split payments both fields populated
  - ✓ No null payment methods

#### Daily Revenue by Order Type
- **What it shows:** Revenue breakdown by order channel
- **Data Required:**
  - `order.order_type` (dine_in, delivery, takeaway)
  - Complete order amounts for each type
  - Tax applied per order type
- **Data Quality Checklist:**
  - ✓ Order type selected at creation
  - ✓ Tax settings configured per order type per branch
  - ✓ Service charges applied correctly

#### Weekly/Monthly/Yearly Revenue Trends
- **What it shows:** Revenue patterns over different time horizons
- **Data Required:**
  - Orders aggregated by week/month/year
  - Consistent order recording daily
  - Seasonal patterns visible with 1+ years data
- **Data Quality Checklist:**
  - ✓ Consistent daily order recording
  - ✓ Date range filters working correctly
  - ✓ Historical data preserved

#### Revenue by Branch
- **What it shows:** Which branches generate most revenue
- **Data Required:**
  - `order.branch_id` correctly populated
  - All orders linked to correct branch
  - Revenue calculations per branch
- **Data Quality Checklist:**
  - ✓ Every order has valid branch_id
  - ✓ No orders with null branch_id
  - ✓ Branch names match between Order and Branch entities

#### Revenue by Delivery Zone
- **What it shows:** Revenue from delivery orders by geographic zone
- **Data Required:**
  - Delivery orders with `delivery_zone_id`
  - Zone boundaries and names configured
  - Delivery address linked to correct zone
- **Data Quality Checklist:**
  - ✓ Delivery zones set up in system
  - ✓ Customer addresses mapped to zones
  - ✓ Zone names consistent

---

## 🌐 3. Website Section

### Website Traffic

#### Daily Page Views Trend
- **What it shows:** Website traffic volume over time
- **Data Required:**
  - PageView tracking events with timestamps
  - Device type recorded
  - User identification (authenticated or session ID)
- **Data Quality Checklist:**
  - ✓ Analytics tracking enabled
  - ✓ No duplicate page view records
  - ✓ Bot traffic filtered out

#### Device Type Distribution (Mobile/Desktop/Tablet)
- **What it shows:** Audience platform breakdown
- **Data Required:**
  - Device type from user agent
  - Browser and OS information
  - Screen resolution
- **Data Quality Checklist:**
  - ✓ User agent parsing working correctly
  - ✓ Device classification accurate
  - ✓ Mobile traffic ≥ 60% (typical)

#### Visitor Status Breakdown (Guest vs Authenticated)
- **What it shows:** Engagement of logged-in vs guest users
- **Data Required:**
  - User authentication status per session
  - Session ID tracking
  - User ID when authenticated
- **Data Quality Checklist:**
  - ✓ Guest sessions properly classified
  - ✓ Authenticated users linked to accounts
  - ✓ No session overlap

#### Top Pages by View Count
- **What it shows:** Most visited pages/sections
- **Data Required:**
  - Page URL/name from each page view
  - View count aggregation
  - Page visit duration (optional)
- **Data Quality Checklist:**
  - ✓ Page paths consistent
  - ✓ Duplicate filtering working
  - ✓ Internal navigation tracked

---

## 💳 4. Finance & HR Section

### Financial Dashboard

#### Cash Position (Actual vs Target)
- **What it shows:** Current available funds vs forecasted needs
- **Data Required:**
  - Daily settlements (cash received)
  - Upcoming obligations (payouts, expenses)
  - Target reserve amount
- **Data Quality Checklist:**
  - ✓ All receipts recorded with date
  - ✓ Payables tracked and scheduled
  - ✓ Reserve target updated regularly

#### Income Statement (Revenue, COGS, Expenses, Profit)
- **What it shows:** Profit & loss summary
- **Data Required:**
  - Revenue: Total from all orders
  - COGS: Food cost from recipes and inventory
  - Operating expenses: Rent, utilities, salaries
  - Net income: Revenue - all costs
- **Data Quality Checklist:**
  - ✓ Food costs updated monthly
  - ✓ Expense entries complete
  - ✓ No duplicate revenue counting

#### Balance Sheet
- **What it shows:** Assets, liabilities, equity snapshot
- **Data Required:**
  - Current assets: Cash, inventory, receivables
  - Liabilities: Loans, supplier credits, payables
  - Equity: Owner investment, retained earnings
- **Data Quality Checklist:**
  - ✓ Inventory valued correctly
  - ✓ Liabilities documented
  - ✓ Reconciliation to GL accounts

### Purchase & Expense Charts

#### Spending by Supplier
- **What it shows:** Which suppliers receive most purchases
- **Data Required:**
  - Purchase invoices with supplier_id
  - Invoice amounts
  - Invoice dates
- **Data Quality Checklist:**
  - ✓ Supplier names consistent
  - ✓ All purchases linked to supplier
  - ✓ No duplicate invoices

#### Monthly Expense Trend
- **What it shows:** Operating expense changes over time
- **Data Required:**
  - Expense entries with category and amount
  - Expense date recorded
  - Payment status tracked
- **Data Quality Checklist:**
  - ✓ Expenses categorized correctly
  - ✓ Dates recorded accurately
  - ✓ Receipts uploaded/linked

#### Expense by Category
- **What it shows:** Where money is spent (utilities, supplies, etc.)
- **Data Required:**
  - Expense category enum (utilities, supplies, maintenance, etc.)
  - Amount per category
  - Multiple expenses per category summed
- **Data Quality Checklist:**
  - ✓ Categories standardized
  - ✓ All expenses categorized
  - ✓ No miscategorizations

### Salary & HR Charts

#### Monthly Payroll Trend
- **What it shows:** Total salary expenses over time
- **Data Required:**
  - Salary records with month and gross_salary
  - Payment status (paid, pending)
  - Employee count per month
- **Data Quality Checklist:**
  - ✓ Salary records created monthly
  - ✓ Gross salary calculated correctly
  - ✓ Deductions applied accurately

#### Attendance Status Distribution
- **What it shows:** Breakdown of present, absent, late arrivals
- **Data Required:**
  - Attendance records with status
  - Shift information and expected hours
  - Sign in/out times
- **Data Quality Checklist:**
  - ✓ Attendance recorded daily
  - ✓ Late arrivals flagged
  - ✓ Absences documented

---

## 🍽️ 5. Food Cost Section

### Food Cost Analysis

#### Food Cost Percentage Trend
- **What it shows:** COGS as % of revenue over time
- **Data Required:**
  - Food cost calculations for all items sold
  - Recipe costs updated
  - Inventory purchase prices current
- **Data Quality Checklist:**
  - ✓ Recipes complete for all menu items
  - ✓ Purchase prices updated with suppliers
  - ✓ Food costs calculated monthly
  - ✓ Food cost % typically 28-35%

#### Variance Analysis
- **What it shows:** Actual costs vs. expected costs
- **Data Required:**
  - Theoretical cost (recipe × quantity sold)
  - Actual cost (purchases - waste + ending inventory)
  - Variance = Actual - Theoretical
- **Data Quality Checklist:**
  - ✓ Variance tracked monthly
  - ✓ Waste declarations complete
  - ✓ Inventory counts accurate

#### Cost per Menu Item
- **What it shows:** Individual item profitability
- **Data Required:**
  - Recipe for each item (all ingredients with quantities)
  - Current purchase price per ingredient
  - Item sales quantity
- **Data Quality Checklist:**
  - ✓ Recipes include all components
  - ✓ Portion sizes consistent
  - ✓ Ingredient prices match supplier invoices

---

## 👥 6. Labor Cost Section

### Labor Analysis

#### Labor Cost as % of Revenue
- **What it shows:** Salary expense impact on profitability
- **Data Required:**
  - Total payroll (all salaries, wages, bonuses)
  - Total hours worked
  - Revenue for same period
- **Data Quality Checklist:**
  - ✓ All employees in payroll system
  - ✓ Hours tracked via attendance
  - ✓ Overtime calculated correctly
  - ✓ Target: 25-35% of revenue

#### Headcount Trend
- **What it shows:** Employee count changes over time
- **Data Required:**
  - Employee records with hire/termination dates
  - Current employee status
  - Role/department classification
- **Data Quality Checklist:**
  - ✓ Active employees marked correctly
  - ✓ Termination dates recorded
  - ✓ Headcount reconciled monthly

#### Attendance Rate
- **What it shows:** Reliability and workforce stability
- **Data Required:**
  - Scheduled shifts per employee
  - Actual attendance records
  - Absences marked
- **Data Quality Checklist:**
  - ✓ Shifts scheduled before period
  - ✓ Attendance recorded daily
  - ✓ Absences documented
  - ✓ Target: 95%+ attendance

---

## 🛒 7. Purchasing Section

### Purchase Analytics

#### Purchase Orders by Status
- **What it shows:** Pipeline of procurement activities
- **Data Required:**
  - PO status: pending_approval, pending, confirmed, delivered
  - Order date and expected delivery
  - Item quantities and prices
- **Data Quality Checklist:**
  - ✓ POs created when stock low
  - ✓ Status updated as received
  - ✓ All approved items have POs

#### Supplier Reliability
- **What it shows:** On-time delivery and quality performance
- **Data Required:**
  - Expected delivery date vs actual
  - Delivery status (complete, partial, late)
  - Quality issues reported
- **Data Quality Checklist:**
  - ✓ Delivery dates recorded
  - ✓ Issues documented
  - ✓ Supplier ratings updated

#### Cost Analysis by Category
- **What it shows:** Where procurement budget is spent
- **Data Required:**
  - Inventory items grouped by category
  - Purchase prices per item
  - Total spend per category
- **Data Quality Checklist:**
  - ✓ Categories standardized
  - ✓ All purchases linked to items
  - ✓ Price variance tracked

---

## 👤 8. Customer Experience Section

### Customer Satisfaction

#### Review Ratings Distribution
- **What it shows:** Customer satisfaction levels
- **Data Required:**
  - Review ratings (1-5 stars)
  - Review comments/feedback
  - Associated order date
- **Data Quality Checklist:**
  - ✓ Reviews linked to orders
  - ✓ Ratings collected consistently
  - ✓ Target: 4.5+ average rating

#### Repeat Customer Rate
- **What it shows:** Customer loyalty and retention
- **Data Required:**
  - Customer purchase history
  - Identification of repeat customers (2+ orders)
  - Time between orders
- **Data Quality Checklist:**
  - ✓ Customers identified correctly
  - ✓ All purchases tracked
  - ✓ Guest customers merged/tracked

#### Customer Growth Trend
- **What it shows:** New customer acquisition over time
- **Data Required:**
  - New customer registrations per period
  - Customer status (active, inactive)
  - Last purchase date
- **Data Quality Checklist:**
  - ✓ Registration dates accurate
  - ✓ Status updated based on activity
  - ✓ Dormant customers identified

---

## 📢 9. Marketing Section

### Campaign Performance

#### Email Engagement Metrics
- **What it shows:** Campaign open and click rates
- **Data Required:**
  - Email send dates and recipient counts
  - Open events tracked
  - Click events tracked
- **Data Quality Checklist:**
  - ✓ Email tracking enabled
  - ✓ Recipient list clean
  - ✓ Unsubscribe list respected

#### Campaign Revenue Attribution
- **What it shows:** Revenue generated from marketing
- **Data Required:**
  - Promo codes tracked by campaign
  - Orders using each promo code
  - Discount amount applied
- **Data Quality Checklist:**
  - ✓ Promo codes unique per campaign
  - ✓ Code usage tracked
  - ✓ Revenue correctly attributed

---

## 👨‍💼 10. Employee Performance Section

### Employee Metrics

#### Sales per Employee
- **What it shows:** Individual productivity and performance
- **Data Required:**
  - Orders by cashier/staff member
  - Sales amount for each employee
  - Hours worked
- **Data Quality Checklist:**
  - ✓ Employees linked to orders (cashier_id)
  - ✓ Hours tracked via attendance
  - ✓ Sales correctly attributed

#### Performance Ratings
- **What it shows:** Manager-evaluated performance
- **Data Required:**
  - Performance reviews or ratings
  - Review dates and periods
  - Rating criteria and scores
- **Data Quality Checklist:**
  - ✓ Reviews conducted regularly
  - ✓ Ratings documented
  - ✓ Feedback recorded

---

## 🍳 11. Kitchen Performance Section

### Kitchen Operations

#### Order Fulfillment Time
- **What it shows:** Kitchen efficiency (order to ready time)
- **Data Required:**
  - Order creation time
  - Kitchen ready time
  - Prep time per item
- **Data Quality Checklist:**
  - ✓ KDS timestamps recorded
  - ✓ Ready time marked when completed
  - ✓ No data entry delays

#### Items Prepared by Capacity
- **What it shows:** Kitchen resource utilization
- **Data Required:**
  - Items prepared per station/period
  - Preparation station (kitchen/bar)
  - Time per item
- **Data Quality Checklist:**
  - ✓ Items routed to correct station
  - ✓ Quantities tracked
  - ✓ Capacity limits identified

---

## 🚚 12. Delivery Section

### Delivery Performance

#### On-Time Delivery Rate
- **What it shows:** Service level compliance
- **Data Required:**
  - Order creation time
  - Promised delivery window
  - Actual delivery completion time
- **Data Quality Checklist:**
  - ✓ Promise times set accurately
  - ✓ Delivery status updated real-time
  - ✓ Target: 95%+ on-time

#### Delivery Time Breakdown
- **What it shows:** Where time is spent (kitchen prep vs transit)
- **Data Required:**
  - Order → Ready time (kitchen)
  - Ready → Pickup time (assignment)
  - Pickup → Delivery time (driver)
- **Data Quality Checklist:**
  - ✓ All timestamps recorded
  - ✓ Bottlenecks identified
  - ✓ Driver performance tracked

#### Delivery Cost Analysis
- **What it shows:** Profitability of delivery channel
- **Data Required:**
  - Delivery fee charged
  - Driver cost (if in-house)
  - Commission to platform (if third-party)
- **Data Quality Checklist:**
  - ✓ Delivery fees configured per zone
  - ✓ Commission rates up-to-date
  - ✓ Profitability by zone calculated

---

## 💎 13. Growth & Loyalty Section

### Loyalty Program Analytics

#### Member Base Growth
- **What it shows:** Loyalty program adoption over time
- **Data Required:**
  - Client count with `loyalty_program_enrolled = true`
  - Enrollment date for new members
  - Active member count (purchased in 90 days)
- **Data Quality Checklist:**
  - ✓ Enrollment tracked at registration
  - ✓ Active status updated based on orders
  - ✓ Churned members identified

#### Cashback Distribution
- **What it shows:** Loyalty reward payout trends
- **Data Required:**
  - Cashback earned per transaction
  - Cashback redeemed/consumed
  - Payout distributions
- **Data Quality Checklist:**
  - ✓ Cashback earned = order total × cashback %
  - ✓ Redemption recorded at checkout
  - ✓ Payouts tracked monthly

#### Referral Network Growth
- **What it shows:** Word-of-mouth program impact
- **Data Required:**
  - Referrer identification (`client.referred_by`)
  - New referrals per referring customer
  - Revenue from referred customers
- **Data Quality Checklist:**
  - ✓ Referrer captured at registration
  - ✓ Referral codes tracked
  - ✓ Bonus distributed correctly

---

## 📋 Menu Engineering Section

### Menu Profitability

#### Item Profitability Matrix
- **What it shows:** Star, plow horse, puzzle items, dogs
- **Data Required:**
  - Menu item popularity (sales count/%)
  - Menu item contribution margin (price - cost)
  - Gross profit per item
- **Data Quality Checklist:**
  - ✓ Prices updated
  - ✓ Costs calculated from recipes
  - ✓ Sales data current and accurate

#### Price Elasticity
- **What it shows:** Optimal pricing for items
- **Data Required:**
  - Historical price changes
  - Sales volume at each price point
  - Customer feedback on value
- **Data Quality Checklist:**
  - ✓ Price changes tracked with dates
  - ✓ Sales recorded per price point
  - ✓ Competitive pricing analyzed

---

## 📦 Inventory Management Section

### Stock Health

#### Stock Aging Analysis
- **What it shows:** How long items sit in inventory (waste risk)
- **Data Required:**
  - Receipt date of inventory
  - Last movement/usage date
  - Expiration dates
- **Data Quality Checklist:**
  - ✓ Receipt dates recorded
  - ✓ FIFO tracking implemented
  - ✓ Expiry dates noted

#### Inventory Accuracy
- **What it shows:** System count vs physical count variance
- **Data Required:**
  - System inventory (automatic deductions)
  - Physical count (monthly/quarterly)
  - Variance investigation/adjustments
- **Data Quality Checklist:**
  - ✓ Physical counts conducted regularly
  - ✓ Variances investigated
  - ✓ Adjustments recorded with reason
  - ✓ Target: ≤2% variance

#### Shrinkage Analysis
- **What it shows:** Lost inventory (waste + theft)
- **Data Required:**
  - Theoretical usage (recipes × items sold)
  - Actual usage (waste + remainder)
  - Shrinkage = Theoretical - Actual
- **Data Quality Checklist:**
  - ✓ Waste declarations complete
  - ✓ Recipes accurate
  - ✓ Inventory counts verified

---

## 🔧 Branch Performance Section

### Multi-Location Analytics

#### Revenue by Branch
- **What it shows:** Which locations are most profitable
- **Data Required:**
  - Orders filtered by branch
  - Branch-level cost allocation
  - Staffing and rent per branch
- **Data Quality Checklist:**
  - ✓ All orders linked to correct branch
  - ✓ Branch costs tracked
  - ✓ Fair allocation methodology used

#### Customer Satisfaction by Branch
- **What it shows:** Service quality variations between locations
- **Data Required:**
  - Reviews linked to orders
  - Branch identification in reviews
  - Ratings aggregated by branch
- **Data Quality Checklist:**
  - ✓ Orders show delivery/branch location
  - ✓ Reviews linked to orders
  - ✓ Adequate review sample per branch

---

## ⚠️ Data Quality Best Practices

### Daily Checklist:
- [ ] All orders have status updated
- [ ] No orders with null branch_id
- [ ] Payment methods recorded for all orders
- [ ] Delivery orders show delivery status
- [ ] Attendance recorded for all employees

### Weekly Checklist:
- [ ] Waste declarations submitted
- [ ] Purchase invoices recorded
- [ ] Stock counts verified in high-velocity items
- [ ] Payroll processed on schedule
- [ ] Reviews moderated/responded to

### Monthly Checklist:
- [ ] Food cost calculations updated
- [ ] Full inventory physical count
- [ ] Supplier invoices reconciled
- [ ] Salary records finalized and paid
- [ ] Dashboard metrics reviewed and validated

### Quarterly Checklist:
- [ ] Purchase prices updated from suppliers
- [ ] Menu prices reviewed for competitiveness
- [ ] Employee performance reviews completed
- [ ] Budget vs actual reconciliation
- [ ] Data quality audit completed

---

## 🎯 Key Data Entry Points

### Critical Forms/Screens to Maintain:
1. **POS System** - Orders, payments, items sold
2. **Inventory Module** - Stock counts, purchases, waste
3. **Attendance System** - Employee sign in/out, shifts
4. **Payroll** - Salary calculations, deductions
5. **Customer Reviews** - Ratings and feedback
6. **Delivery Tracking** - Order status and timing
7. **Recipe Management** - Menu item ingredients and costs
8. **Supplier Invoices** - Purchase prices and quantities

---

## 📞 Support & Validation

If any metric shows unexpected values or trends:
1. Check the data quality checklist for that metric
2. Verify recent data entries are complete
3. Look for system errors or incomplete forms
4. Review the "Data Required" fields for gaps
5. Contact your system administrator if issues persist