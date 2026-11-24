# VibeCoding ERP Mini

A lightweight, enterprise-grade ERP engine managing inventory, order lifecycle state machines, and double-entry accounting.

## Language

### Inventory

**Product**:
A physical unit of inventory available for sale with tracked stock levels.
_Avoid_: Item, SKU, merchandise, good

**Physical Stock**:
The actual quantity of a product physically present in the warehouse.
_Avoid_: On-hand inventory, real stock, total quantity

**Available Stock**:
The quantity of a product currently unreserved and eligible for purchase, equal to physical stock minus active reservations.
_Avoid_: Free stock, sellable inventory, usable count

**Stock Reservation**:
A temporary 15-minute hold on a product's available stock while an order is awaiting payment.
_Avoid_: Hold, lock, booking, soft reservation

**Active Reservation**:
A stock reservation that has not yet expired (within its 15-minute TTL) and has not been committed or released.
_Avoid_: Pending hold, valid reservation

**Committed Reservation**:
A stock reservation permanently converted into a physical stock deduction upon successful payment.
_Avoid_: Finalized hold, confirmed reservation

**Released Reservation**:
A stock reservation that was cancelled or expired, returning the held quantity back to available stock.
_Avoid_: Cancelled hold, unlocked stock

### Order

**Order**:
A customer's binding request to purchase one or more products progressing through discrete lifecycle states.
_Avoid_: Purchase, transaction, cart, checkout

**Order Status**:
The current lifecycle phase of an order, strictly restricted to DRAFT, PAID, SHIPPED, DONE, or CANCELLED.
_Avoid_: State, phase, order stage

**Order Item**:
A specific product line and quantity requested within an order.
_Avoid_: Line item, order entry, cart product

### Ledger

**Double-entry Ledger**:
The financial record where every monetary movement produces balanced debit and credit entries.
_Avoid_: Accounting book, transaction log

**Account**:
A categorized financial bucket within the Chart of Accounts tracking assets, liabilities, equity, revenue, or expenses.
_Avoid_: Ledger account, balance category, account head

**Chart of Accounts**:
The complete structured registry of defined accounts used for financial categorization.
_Avoid_: Account list, category tree

**Accounting Transaction**:
An atomic business event bundling two or more balanced ledger entries.
_Avoid_: Journal batch, voucher, transaction group

**Ledger Entry**:
A single line item within an accounting transaction debiting or crediting a specific account.
_Avoid_: Journal item, posting line, debit/credit split

**Invoice**:
A formal financial document requesting payment for an order and serving as the accounting source document.
_Avoid_: Bill, receipt, payment request
