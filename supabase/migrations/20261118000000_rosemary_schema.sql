-- Rosemary ERP & Catering Full Database Migration
-- Generated automatically from 179 Base44 Entities
-- Target: PostgreSQL / Supabase

-- Cleanup legacy ATM Insights objects
DROP TABLE IF EXISTS atm_logs CASCADE;
DROP FUNCTION IF EXISTS get_atm_dashboard_analytics(TEXT);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- Entity: ActiveOffer -> Table: active_offer

CREATE TABLE IF NOT EXISTS active_offer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT false,
    time_type TEXT,
    start_time TEXT,
    end_time TEXT,
    days_type TEXT,
    selected_days JSONB DEFAULT '[]'::jsonb,
    offer_type TEXT,
    free_item_menu_item_ids JSONB DEFAULT '[]'::jsonb,
    max_items NUMERIC,
    max_free_items NUMERIC,
    free_item_menu_item_ids_group2 JSONB DEFAULT '[]'::jsonb,
    max_items_group2 NUMERIC,
    max_free_items_group2 NUMERIC,
    required_item_ids JSONB DEFAULT '[]'::jsonb,
    discount_type TEXT,
    discount_percentage NUMERIC,
    discounted_item_ids JSONB DEFAULT '[]'::jsonb,
    fixed_price_items JSONB DEFAULT '[]'::jsonb,
    bundle_item_id TEXT,
    bundle_content_item_ids JSONB DEFAULT '[]'::jsonb,
    order_types JSONB DEFAULT '[]'::jsonb,
    min_order_amount NUMERIC,
    disable_combo_drink BOOLEAN DEFAULT false
);

-- Entity: Address -> Table: address

CREATE TABLE IF NOT EXISTS address (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    address_name TEXT,
    street_address TEXT,
    city TEXT,
    area TEXT,
    building TEXT,
    floor TEXT,
    apartment TEXT,
    phone TEXT,
    location_url TEXT,
    qr_code_image_url TEXT,
    is_default BOOLEAN DEFAULT false,
    notes TEXT
);

-- Entity: Animal -> Table: animal

CREATE TABLE IF NOT EXISTS animal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    tag_number TEXT,
    species TEXT,
    breed TEXT,
    sex TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    date_received DATE,
    live_weight NUMERIC,
    weight_unit TEXT,
    purchase_cost NUMERIC,
    status TEXT,
    processing_batch_id TEXT,
    closure_reason TEXT,
    loss_booked BOOLEAN DEFAULT false,
    notes TEXT
);

-- Entity: Attendance -> Table: attendance

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    employee_id TEXT,
    employee_name TEXT,
    shift_id TEXT,
    attendance_date DATE,
    sign_in_time TIMESTAMPTZ,
    sign_out_time TIMESTAMPTZ,
    sign_in_photo_url TEXT,
    sign_out_photo_url TEXT,
    sign_in_location_verified BOOLEAN DEFAULT false,
    sign_in_latitude NUMERIC,
    sign_in_longitude NUMERIC,
    sign_out_location_verified BOOLEAN DEFAULT false,
    sign_out_latitude NUMERIC,
    sign_out_longitude NUMERIC,
    face_scan_verified BOOLEAN DEFAULT false,
    manual_request_note TEXT,
    manual_location_captured BOOLEAN DEFAULT false,
    hr_confirmed_by TEXT,
    hr_confirmed_date TIMESTAMPTZ,
    hr_rejection_reason TEXT,
    hr_rejected_by TEXT,
    hr_rejected_date TIMESTAMPTZ,
    hours_worked NUMERIC,
    status TEXT,
    admin_approved BOOLEAN DEFAULT false,
    review_status TEXT,
    approved_by TEXT,
    approved_date TIMESTAMPTZ,
    assigned_shift_label TEXT,
    assigned_shift_start TEXT,
    assigned_shift_end TEXT,
    shift_expected_hours NUMERIC,
    late_minutes NUMERIC,
    early_leave_minutes NUMERIC,
    overtime_hours NUMERIC,
    regular_hours NUMERIC,
    overtime_earnings NUMERIC,
    regular_earnings NUMERIC,
    deduction_amount NUMERIC,
    deduction_breakdown TEXT,
    calculated_earnings NUMERIC,
    reviewer_notes TEXT,
    exception_waived BOOLEAN DEFAULT false,
    exception_reason TEXT,
    exception_by TEXT,
    exception_date TIMESTAMPTZ,
    waived_deduction_amount NUMERIC,
    waived_deduction_breakdown TEXT,
    notes TEXT
);

-- Entity: AttendancePolicy -> Table: attendance_policy

CREATE TABLE IF NOT EXISTS attendance_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    policy_name TEXT,
    is_active BOOLEAN DEFAULT false,
    overtime_rate_multiplier NUMERIC,
    late_grace_minutes NUMERIC,
    late_deduction_mode TEXT,
    late_deduction_per_hour NUMERIC,
    late_deduction_tiers JSONB DEFAULT '[]'::jsonb,
    early_leave_deduction_mode TEXT,
    early_leave_deduction_per_hour NUMERIC,
    early_leave_deduction_tiers JSONB DEFAULT '[]'::jsonb,
    absence_penalty_amount NUMERIC,
    shift_presets JSONB DEFAULT '[]'::jsonb,
    require_approval_for_payroll BOOLEAN DEFAULT false
);

-- Entity: AuditLog -> Table: audit_log

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    admin_id TEXT,
    admin_email TEXT,
    action_type TEXT,
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    action_description TEXT,
    changes JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    status TEXT,
    error_message TEXT
);

-- Entity: BalanceRecharge -> Table: balance_recharge

CREATE TABLE IF NOT EXISTS balance_recharge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    client_id TEXT,
    client_name TEXT,
    client_email TEXT,
    amount_paid NUMERIC,
    payment_method TEXT,
    payment_receipt_url TEXT,
    cashback_percentage NUMERIC,
    cashback_amount NUMERIC,
    total_credited NUMERIC,
    status TEXT,
    approved_by TEXT,
    rejection_reason TEXT,
    notes TEXT
);

-- Entity: BorrowingPolicy -> Table: borrowing_policy

CREATE TABLE IF NOT EXISTS borrowing_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    setting_key TEXT,
    enabled BOOLEAN DEFAULT false,
    max_percent_of_salary NUMERIC,
    min_notice_hours NUMERIC,
    windows JSONB DEFAULT '[]'::jsonb
);

-- Entity: Branch -> Table: branch

CREATE TABLE IF NOT EXISTS branch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    branch_code TEXT,
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    address TEXT,
    landline TEXT,
    hotline TEXT,
    whatsapp TEXT,
    website TEXT,
    location TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    radius_meters NUMERIC,
    facebook TEXT,
    instagram TEXT,
    tiktok TEXT,
    dine_in_tax_percentage NUMERIC,
    dine_in_service_percentage NUMERIC,
    delivery_tax_percentage NUMERIC,
    delivery_service_percentage NUMERIC,
    takeaway_tax_percentage NUMERIC,
    takeaway_service_percentage NUMERIC,
    partnership_marketing_text TEXT,
    guest_loyalty_program_text TEXT,
    restaurant_logo_url TEXT,
    receipt_header TEXT,
    receipt_footer TEXT,
    commercial_registration TEXT,
    tax_card TEXT
);

-- Entity: ButcheryExpense -> Table: butchery_expense

CREATE TABLE IF NOT EXISTS butchery_expense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    category TEXT,
    date DATE,
    description TEXT,
    amount NUMERIC,
    weight NUMERIC,
    cost_per_kg NUMERIC,
    vendor_name TEXT,
    animal_id TEXT,
    animal_tag TEXT,
    notes TEXT
);

-- Entity: ButcheryRawMaterial -> Table: butchery_raw_material

CREATE TABLE IF NOT EXISTS butchery_raw_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    sku_name TEXT,
    item_name TEXT,
    lot_number TEXT,
    source_type TEXT,
    primal_cut_id TEXT,
    waste_byproduct_id TEXT,
    rework_event_id TEXT,
    slaughter_event_id TEXT,
    animal_id TEXT,
    animal_tag TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    quantity NUMERIC,
    unit TEXT,
    packaging_date DATE,
    quality_grade TEXT,
    allocation_method TEXT,
    allocated_cost NUMERIC,
    unit_cost NUMERIC,
    market_price_per_unit NUMERIC,
    inventory_item_id TEXT,
    status TEXT,
    sale_price NUMERIC,
    sale_quantity NUMERIC,
    sale_date DATE,
    actual_margin NUMERIC,
    margin_percentage NUMERIC,
    rework_parent_lot_chain JSONB DEFAULT '[]'::jsonb,
    notes TEXT
);

-- Entity: ButcherySupplier -> Table: butchery_supplier

CREATE TABLE IF NOT EXISTS butchery_supplier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT
);

-- Entity: CampaignRecipient -> Table: campaign_recipient

CREATE TABLE IF NOT EXISTS campaign_recipient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    client_id TEXT,
    client_email TEXT,
    client_name TEXT,
    status TEXT,
    sent_date TIMESTAMPTZ,
    error_message TEXT
);

-- Entity: CashbackDistributionPending -> Table: cashback_distribution_pending

CREATE TABLE IF NOT EXISTS cashback_distribution_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    order_id TEXT,
    customer_id TEXT,
    customer_name TEXT,
    order_total NUMERIC,
    order_type TEXT,
    payment_method TEXT,
    cashback_amount NUMERIC,
    cashback_to_customer NUMERIC,
    payout_to_customer NUMERIC,
    referral_cashback_details JSONB DEFAULT '[]'::jsonb,
    status TEXT,
    rejection_reason TEXT,
    approved_by TEXT,
    executed_by TEXT,
    execution_timestamp TIMESTAMPTZ
);

-- Entity: CashbackRule -> Table: cashback_rule

CREATE TABLE IF NOT EXISTS cashback_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    rule_type TEXT,
    order_type TEXT,
    customer_tier TEXT,
    promotional_period_name TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    self_cashback_percentage NUMERIC,
    level1_cashback_percentage NUMERIC,
    level2_cashback_percentage NUMERIC,
    level3_cashback_percentage NUMERIC,
    payout_percentage NUMERIC,
    is_active BOOLEAN DEFAULT false,
    priority NUMERIC,
    notes TEXT
);

-- Entity: CashbackRuleHistory -> Table: cashback_rule_history

CREATE TABLE IF NOT EXISTS cashback_rule_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    order_id TEXT,
    customer_id TEXT,
    customer_name TEXT,
    rule_id TEXT,
    rule_name TEXT,
    rule_type TEXT,
    order_type TEXT,
    order_total NUMERIC,
    self_cashback_rate NUMERIC,
    self_cashback_amount NUMERIC,
    level1_rate NUMERIC,
    level2_rate NUMERIC,
    level3_rate NUMERIC,
    total_cashback_applied NUMERIC,
    total_payout_applied NUMERIC,
    applied_date TIMESTAMPTZ,
    notes TEXT
);

-- Entity: CashbackTier -> Table: cashback_tier

CREATE TABLE IF NOT EXISTS cashback_tier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    level_name TEXT,
    min_referrals NUMERIC,
    registration_level_id TEXT,
    registration_level_name TEXT,
    cashback_percentage_level1 NUMERIC,
    cashback_percentage_level2 NUMERIC,
    cashback_percentage_level3 NUMERIC,
    self_cashback_percentage NUMERIC,
    is_default BOOLEAN DEFAULT false,
    color TEXT
);

-- Entity: CashbackTransaction -> Table: cashback_transaction

CREATE TABLE IF NOT EXISTS cashback_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    client_name TEXT,
    transaction_type TEXT,
    amount NUMERIC,
    cashback_amount NUMERIC,
    payout_amount NUMERIC,
    source_client_id TEXT,
    source_client_name TEXT,
    purchase_amount NUMERIC,
    referral_level NUMERIC,
    cashback_rate NUMERIC,
    description TEXT
);

-- Entity: CashierPurchase -> Table: cashier_purchase

CREATE TABLE IF NOT EXISTS cashier_purchase (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    session_id TEXT,
    purchase_date TIMESTAMPTZ,
    supplier TEXT,
    supplier_id TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC,
    payment_method TEXT,
    payment_status TEXT,
    paid_date TIMESTAMPTZ,
    invoice_number TEXT,
    receipt_url TEXT,
    status TEXT,
    approved_by TEXT,
    rejection_reason TEXT,
    submitted_by TEXT,
    notes TEXT
);

-- Entity: CashierSession -> Table: cashier_session

CREATE TABLE IF NOT EXISTS cashier_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    session_date DATE,
    cashier_id TEXT,
    cashier_name TEXT,
    opening_time TIMESTAMPTZ,
    closing_time TIMESTAMPTZ,
    opening_cash NUMERIC,
    closing_cash NUMERIC,
    expected_cash NUMERIC,
    cash_difference NUMERIC,
    total_sales NUMERIC,
    cash_sales NUMERIC,
    card_sales NUMERIC,
    wallet_sales NUMERIC,
    recharge_balance_sales NUMERIC,
    total_expenses NUMERIC,
    total_returns NUMERIC,
    total_delivery_orders NUMERIC,
    total_delivery_cash NUMERIC,
    total_delivery_credit NUMERIC,
    delivery_breakdown JSONB DEFAULT '{}'::jsonb,
    total_delivery_commission NUMERIC,
    new_recharge_cash NUMERIC,
    new_recharge_visa NUMERIC,
    total_new_recharge NUMERIC,
    recharge_balance_remaining NUMERIC,
    total_orders NUMERIC,
    status TEXT,
    notes TEXT
);

-- Entity: CateringActualCostRun -> Table: catering_actual_cost_run

CREATE TABLE IF NOT EXISTS catering_actual_cost_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    event_id TEXT,
    branch_id TEXT,
    calculated_at TIMESTAMPTZ,
    calculated_by TEXT,
    version TEXT,
    status TEXT,
    currency TEXT,
    food_cost TEXT,
    labor_cost TEXT,
    equipment_cost TEXT,
    total_cost TEXT,
    revenue TEXT,
    margin TEXT,
    margin_percentage TEXT,
    margin_bridge_expected_margin TEXT,
    margin_bridge_actual_margin TEXT,
    margin_bridge_expected_delta TEXT,
    margin_bridge_total_delta TEXT,
    margin_bridge_mismatch_amount TEXT,
    margin_bridge_consistent TEXT,
    margin_bridge_lines JSONB DEFAULT '[]'::jsonb,
    margin_bridge_ranking JSONB DEFAULT '[]'::jsonb,
    warning_codes JSONB DEFAULT '[]'::jsonb,
    source_counts JSONB DEFAULT '{}'::jsonb,
    audit_file_uri TEXT
);

-- Entity: CateringAssignment -> Table: catering_assignment

CREATE TABLE IF NOT EXISTS catering_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    role_name TEXT,
    role_id TEXT,
    is_critical_role BOOLEAN DEFAULT false,
    check_in_location_type TEXT,
    employee_id TEXT,
    employee_name TEXT,
    employment_type TEXT,
    start_time TEXT,
    end_time TEXT,
    expected_hours NUMERIC,
    hourly_rate NUMERIC,
    estimated_cost NUMERIC,
    shift_id TEXT,
    status TEXT,
    assignment_notified BOOLEAN DEFAULT false,
    availability_conflict BOOLEAN DEFAULT false,
    conflict_detail TEXT,
    override_by TEXT,
    override_reason TEXT,
    match_score NUMERIC,
    assigned_by TEXT,
    released_by TEXT,
    released_date TIMESTAMPTZ,
    notes TEXT
);

-- Entity: CateringCancellationPolicy -> Table: catering_cancellation_policy

CREATE TABLE IF NOT EXISTS catering_cancellation_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    tiers JSONB DEFAULT '[]'::jsonb
);

-- Entity: CateringCostException -> Table: catering_cost_exception

CREATE TABLE IF NOT EXISTS catering_cost_exception (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    event_id TEXT,
    event_name TEXT,
    branch_id TEXT,
    category TEXT,
    amount NUMERIC,
    description TEXT,
    note TEXT,
    status TEXT,
    recorded_by TEXT,
    recorded_at TIMESTAMPTZ,
    voided_by TEXT,
    voided_at TIMESTAMPTZ,
    void_reason TEXT
);

-- Entity: CateringCustodyCheckpoint -> Table: catering_custody_checkpoint

CREATE TABLE IF NOT EXISTS catering_custody_checkpoint (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    trip_id TEXT,
    trip_label TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    branch_id TEXT,
    branch_name TEXT,
    stage TEXT,
    status TEXT,
    reported_by_employee_id TEXT,
    reported_by_name TEXT,
    reported_by_email TEXT,
    responsible_employee_id TEXT,
    responsible_name TEXT,
    responsible_email TEXT,
    confirmed_at TIMESTAMPTZ,
    item_details JSONB DEFAULT '[]'::jsonb,
    discrepancy_notes TEXT,
    photo_url TEXT,
    feedback_id TEXT
);

-- Entity: CateringEquipment -> Table: catering_equipment

CREATE TABLE IF NOT EXISTS catering_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    category TEXT,
    tracking_mode TEXT,
    total_quantity NUMERIC,
    unit_label TEXT,
    purchase_date DATE,
    purchase_cost NUMERIC,
    useful_life_years NUMERIC,
    salvage_value_percentage NUMERIC,
    home_branch_id TEXT,
    home_branch_name TEXT,
    storage_location TEXT,
    requires_vehicle BOOLEAN DEFAULT false,
    usage_cost_per_event NUMERIC,
    cost_source TEXT,
    replacement_cost NUMERIC,
    is_active BOOLEAN DEFAULT false,
    notes TEXT
);

-- Entity: CateringEquipmentMaintenance -> Table: catering_equipment_maintenance

CREATE TABLE IF NOT EXISTS catering_equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    equipment_id TEXT,
    equipment_name TEXT,
    unit_id TEXT,
    unit_code TEXT,
    reservation_id TEXT,
    checkin_key TEXT,
    record_type TEXT,
    status TEXT,
    quantity_affected NUMERIC,
    description TEXT,
    scheduled_date DATE,
    resolved_date TIMESTAMPTZ,
    cost NUMERIC,
    event_id TEXT,
    event_name TEXT,
    reported_by TEXT,
    resolved_by TEXT,
    notes TEXT
);

-- Entity: CateringEquipmentReservation -> Table: catering_equipment_reservation

CREATE TABLE IF NOT EXISTS catering_equipment_reservation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    equipment_id TEXT,
    equipment_name TEXT,
    tracking_mode TEXT,
    unit_id TEXT,
    unit_code TEXT,
    quantity NUMERIC,
    unit_label TEXT,
    usage_cost_per_event NUMERIC,
    cost_overridden BOOLEAN DEFAULT false,
    status TEXT,
    had_conflict BOOLEAN DEFAULT false,
    conflict_detail TEXT,
    override_by TEXT,
    override_reason TEXT,
    dispatched_date TIMESTAMPTZ,
    returned_date TIMESTAMPTZ,
    returned_by TEXT,
    returned_quantity NUMERIC,
    damaged_quantity NUMERIC,
    missing_quantity NUMERIC,
    missing_cost NUMERIC,
    replacement_unit_cost_snapshot NUMERIC,
    replacement_cost_basis TEXT,
    return_notes TEXT,
    reserved_by TEXT,
    released_by TEXT,
    released_date TIMESTAMPTZ,
    release_reason TEXT,
    notes TEXT
);

-- Entity: CateringEquipmentUnit -> Table: catering_equipment_unit

CREATE TABLE IF NOT EXISTS catering_equipment_unit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    equipment_id TEXT,
    equipment_name TEXT,
    unit_code TEXT,
    serial_number TEXT,
    status TEXT,
    current_location_type TEXT,
    current_location_name TEXT,
    current_event_id TEXT,
    current_event_name TEXT,
    purchase_date DATE,
    notes TEXT
);

-- Entity: CateringEvent -> Table: catering_event

CREATE TABLE IF NOT EXISTS catering_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_code TEXT,
    client_id TEXT,
    client_name TEXT,
    client_phone TEXT,
    event_name TEXT,
    event_type TEXT,
    event_date DATE,
    start_time TEXT,
    end_time TEXT,
    duration_hours NUMERIC,
    location_type TEXT,
    venue_name TEXT,
    venue_address TEXT,
    venue_setting TEXT,
    venue_lat NUMERIC,
    venue_lng NUMERIC,
    theme TEXT,
    decoration_requirements TEXT,
    service_style TEXT,
    dress_code TEXT,
    special_requests JSONB DEFAULT '[]'::jsonb,
    onsite_contact_name TEXT,
    onsite_contact_phone TEXT,
    expected_guests NUMERIC,
    guaranteed_guests NUMERIC,
    guarantee_cutoff_date DATE,
    guarantee_locked BOOLEAN DEFAULT false,
    status TEXT,
    deposit_declared_method TEXT,
    deposit_declared_reference TEXT,
    deposit_declared_date TIMESTAMPTZ,
    deposit_declared_amount NUMERIC,
    active_quote_id TEXT,
    active_quote_revision NUMERIC,
    quote_total NUMERIC,
    deposit_percentage NUMERIC,
    required_deposit_amount NUMERIC,
    deposit_paid_amount NUMERIC,
    total_paid NUMERIC,
    balance_due NUMERIC,
    deposit_status TEXT,
    inventory_reserved BOOLEAN DEFAULT false,
    reservation_status TEXT,
    reservation_requested_by TEXT,
    reservation_requested_date TIMESTAMPTZ,
    reservation_approved_by TEXT,
    reservation_approved_date TIMESTAMPTZ,
    reservation_rejection_reason TEXT,
    reservation_shortfall_count NUMERIC,
    reservation_last_run TIMESTAMPTZ,
    procurement_status TEXT,
    procurement_po_count NUMERIC,
    open_shortfall_count NUMERIC,
    production_plan_status TEXT,
    production_plan_date TIMESTAMPTZ,
    production_planned_from_quote_id TEXT,
    production_batch_count NUMERIC,
    staffing_requirements JSONB DEFAULT '[]'::jsonb,
    staffing_status TEXT,
    staffing_assigned_count NUMERIC,
    staffing_required_count NUMERIC,
    staffing_unfilled_critical_count NUMERIC,
    estimated_labor_cost NUMERIC,
    labor_cost_locked BOOLEAN DEFAULT false,
    labor_cost_locked_date TIMESTAMPTZ,
    labor_cost_locked_by TEXT,
    labor_cost_breakdown JSONB DEFAULT '[]'::jsonb,
    cancellation_policy_id TEXT,
    cancelled_date TIMESTAMPTZ,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    cancellation_penalty_percentage NUMERIC,
    cancellation_penalty_amount NUMERIC,
    reschedule_history JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    actual_food_cost TEXT,
    actual_labor_cost TEXT,
    actual_equipment_cost TEXT,
    actual_total_cost TEXT,
    actual_revenue TEXT,
    actual_revenue_basis TEXT,
    actual_margin TEXT,
    actual_margin_percentage TEXT,
    actual_cost_status TEXT,
    actual_cost_warning_codes JSONB DEFAULT '[]'::jsonb,
    actual_food_cost_implausible BOOLEAN DEFAULT false,
    actual_cost_computed_at TIMESTAMPTZ,
    actual_cost_version TEXT,
    actual_cost_run_id TEXT,
    loss_analysis_status TEXT,
    applicable_target_margin_percentage NUMERIC,
    applicable_target_margin_source TEXT,
    use_requisition_flow BOOLEAN DEFAULT false
);

-- Entity: CateringEventTypeDiscount -> Table: catering_event_type_discount

CREATE TABLE IF NOT EXISTS catering_event_type_discount (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_type TEXT,
    discount_mode TEXT,
    discount_value NUMERIC,
    target_margin_percentage TEXT,
    is_active BOOLEAN DEFAULT false,
    reason TEXT,
    last_applied_date TIMESTAMPTZ,
    last_applied_count NUMERIC,
    created_by_email TEXT
);

-- Entity: CateringInvitation -> Table: catering_invitation

CREATE TABLE IF NOT EXISTS catering_invitation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    guest_name TEXT,
    email TEXT,
    phone TEXT,
    party_size NUMERIC,
    token TEXT,
    pass_code TEXT,
    rsvp_status TEXT,
    rsvp_party_size NUMERIC,
    rsvp_date TIMESTAMPTZ,
    email_sent_at TIMESTAMPTZ,
    whatsapp_sent_at TIMESTAMPTZ,
    sms_sent_at TIMESTAMPTZ,
    last_sent_channel TEXT,
    dietary_notes TEXT,
    guest_message TEXT,
    table_assignment TEXT,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    notes TEXT
);

-- Entity: CateringMediaVendor -> Table: catering_media_vendor

CREATE TABLE IF NOT EXISTS catering_media_vendor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    service_type TEXT,
    tier TEXT,
    phone TEXT,
    email TEXT,
    instagram TEXT,
    price_basis TEXT,
    price NUMERIC,
    coverage_hours NUMERIC,
    deliverables TEXT,
    branch_id TEXT,
    branch_name TEXT,
    is_active BOOLEAN DEFAULT false,
    notes TEXT
);

-- Entity: CateringOption -> Table: catering_option

CREATE TABLE IF NOT EXISTS catering_option (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    list_type TEXT,
    name TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    sort_order NUMERIC
);

-- Entity: CateringPackage -> Table: catering_package

CREATE TABLE IF NOT EXISTS catering_package (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    package_category TEXT,
    branch_id TEXT,
    branch_name TEXT,
    pricing_mode TEXT,
    base_price_per_guest NUMERIC,
    flat_price NUMERIC,
    min_guests NUMERIC,
    target_margin_percentage TEXT,
    is_active BOOLEAN DEFAULT false,
    line_items JSONB DEFAULT '[]'::jsonb,
    extra_items JSONB DEFAULT '[]'::jsonb,
    equipment_requirements JSONB DEFAULT '[]'::jsonb,
    material_requirements JSONB DEFAULT '[]'::jsonb,
    times_used NUMERIC,
    last_used_date TIMESTAMPTZ,
    notes TEXT
);

-- Entity: CateringPassBranding -> Table: catering_pass_branding

CREATE TABLE IF NOT EXISTS catering_pass_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    logo_url TEXT,
    email_subject TEXT,
    email_body TEXT,
    email_subject_ar TEXT,
    email_body_ar TEXT,
    doc_email_subject TEXT,
    doc_email_body TEXT,
    doc_email_subject_ar TEXT,
    doc_email_body_ar TEXT
);

-- Entity: CateringPayment -> Table: catering_payment

CREATE TABLE IF NOT EXISTS catering_payment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    quote_id TEXT,
    client_id TEXT,
    client_name TEXT,
    payment_type TEXT,
    source TEXT,
    amount NUMERIC,
    payment_method TEXT,
    status TEXT,
    payment_date TIMESTAMPTZ,
    reference TEXT,
    receipt_url TEXT,
    recorded_by TEXT,
    recorded_by_id TEXT,
    credit_note BOOLEAN DEFAULT false,
    approved_by TEXT,
    approved_date TIMESTAMPTZ,
    rejection_reason TEXT,
    voided_by TEXT,
    voided_date TIMESTAMPTZ,
    void_reason TEXT,
    notes TEXT
);

-- Entity: CateringPaymentReviewLock -> Table: catering_payment_review_lock

CREATE TABLE IF NOT EXISTS catering_payment_review_lock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    event_id TEXT,
    token TEXT,
    started_at TEXT
);

-- Entity: CateringPortalAccess -> Table: catering_portal_access

CREATE TABLE IF NOT EXISTS catering_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    client_name TEXT,
    email TEXT,
    status TEXT,
    linked_user_id TEXT,
    invited_by TEXT,
    invited_date TIMESTAMPTZ,
    linked_date TIMESTAMPTZ,
    revoked_by TEXT,
    revoked_date TIMESTAMPTZ,
    notes TEXT
);

-- Entity: CateringPortalQuoteOverride -> Table: catering_portal_quote_override

CREATE TABLE IF NOT EXISTS catering_portal_quote_override (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    event_id TEXT,
    event_name TEXT,
    override_enabled BOOLEAN DEFAULT false,
    portal_show_line_items BOOLEAN DEFAULT false,
    portal_show_quantities BOOLEAN DEFAULT false,
    portal_show_line_prices BOOLEAN DEFAULT false,
    portal_show_charge_breakdown BOOLEAN DEFAULT false,
    portal_show_service_costs BOOLEAN DEFAULT false,
    portal_show_payment_history BOOLEAN DEFAULT false,
    hidden_charge_allocation TEXT,
    portal_show_per_guest_price BOOLEAN DEFAULT false,
    portal_hide_discount BOOLEAN DEFAULT false,
    portal_starting_from_mode BOOLEAN DEFAULT false,
    portal_show_balance_due BOOLEAN DEFAULT false,
    portal_label_subtotal TEXT,
    portal_label_service_charge TEXT,
    portal_label_tax TEXT,
    portal_label_total TEXT,
    portal_round_total_to NUMERIC,
    portal_package_only_mode BOOLEAN DEFAULT false,
    portal_hide_internal_notes BOOLEAN DEFAULT false,
    created_by_email TEXT
);

-- Entity: CateringProcurementSettings -> Table: catering_procurement_settings

CREATE TABLE IF NOT EXISTS catering_procurement_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    setting_key TEXT,
    planning_horizon_days NUMERIC,
    urgent_threshold_days NUMERIC,
    default_delivery_buffer_days NUMERIC
);

-- Entity: CateringQuote -> Table: catering_quote

CREATE TABLE IF NOT EXISTS catering_quote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    client_id TEXT,
    client_name TEXT,
    revision_number NUMERIC,
    status TEXT,
    customer_decision_date TIMESTAMPTZ,
    customer_decision_total NUMERIC,
    staff_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by TEXT,
    acknowledged_date TIMESTAMPTZ,
    staff_response_note TEXT,
    package_id TEXT,
    package_name TEXT,
    package_category TEXT,
    package_source TEXT,
    package_description TEXT,
    variant_label TEXT,
    guests_at_quote NUMERIC,
    line_items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC,
    line_discount_total NUMERIC,
    tax_rate NUMERIC,
    tax_total NUMERIC,
    service_charge_rate NUMERIC,
    service_charge_total NUMERIC,
    discount_amount NUMERIC,
    total NUMERIC,
    estimated_cost NUMERIC,
    estimated_margin NUMERIC,
    estimated_margin_percentage NUMERIC,
    deposit_percentage NUMERIC,
    required_deposit NUMERIC,
    credit_check_status TEXT,
    credit_exposure_snapshot NUMERIC,
    credit_limit_snapshot NUMERIC,
    credit_override_by TEXT,
    valid_until DATE,
    created_by_email TEXT,
    notes TEXT
);

-- Entity: CateringReconciliation -> Table: catering_reconciliation

CREATE TABLE IF NOT EXISTS catering_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    client_id TEXT,
    client_name TEXT,
    expected_guests NUMERIC,
    guaranteed_guests NUMERIC,
    actual_guests NUMERIC,
    guarantee_locked BOOLEAN DEFAULT false,
    billable_guests NUMERIC,
    billing_basis TEXT,
    quote_total NUMERIC,
    quote_id TEXT,
    guest_adjustment NUMERIC,
    additional_charges JSONB DEFAULT '[]'::jsonb,
    additional_charges_total NUMERIC,
    final_billing_total NUMERIC,
    total_paid NUMERIC,
    final_balance_due NUMERIC,
    equipment_returned_count NUMERIC,
    equipment_outstanding_count NUMERIC,
    equipment_damaged_count NUMERIC,
    equipment_missing_count NUMERIC,
    inventory_released BOOLEAN DEFAULT false,
    post_event_notes TEXT,
    client_feedback TEXT,
    client_rating NUMERIC,
    status TEXT,
    finalized_by TEXT,
    finalized_date TIMESTAMPTZ
);

-- Entity: CateringReservation -> Table: catering_reservation

CREATE TABLE IF NOT EXISTS catering_reservation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    quote_id TEXT,
    inventory_item_id TEXT,
    inventory_item_name TEXT,
    unit TEXT,
    purpose TEXT,
    production_order_id TEXT,
    produced_item_name TEXT,
    quantity_reserved NUMERIC,
    actual_quantity NUMERIC,
    available_at_reservation NUMERIC,
    shortfall_quantity NUMERIC,
    needed_by_date DATE,
    at_risk BOOLEAN DEFAULT false,
    purchase_order_id TEXT,
    purchase_order_number TEXT,
    procurement_status TEXT,
    status TEXT,
    reserved_by TEXT,
    released_by TEXT,
    released_date TIMESTAMPTZ,
    release_reason TEXT,
    consumed_by TEXT,
    consumed_date TIMESTAMPTZ,
    notes TEXT
);

-- Entity: CateringReturnedItem -> Table: catering_returned_item

CREATE TABLE IF NOT EXISTS catering_returned_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    inventory_item_id TEXT,
    item_name TEXT,
    category TEXT,
    quantity NUMERIC,
    unit TEXT,
    unit_cost NUMERIC,
    total_value NUMERIC,
    condition TEXT,
    disposition TEXT,
    recorded_by TEXT,
    notes TEXT
);

-- Entity: CateringSettings -> Table: catering_settings

CREATE TABLE IF NOT EXISTS catering_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    logistics_enabled BOOLEAN DEFAULT false,
    custody_emails_enabled BOOLEAN DEFAULT false,
    portal_show_line_items BOOLEAN DEFAULT false,
    portal_show_quantities BOOLEAN DEFAULT false,
    portal_show_line_prices BOOLEAN DEFAULT false,
    portal_show_charge_breakdown BOOLEAN DEFAULT false,
    portal_show_service_costs BOOLEAN DEFAULT false,
    portal_show_payment_history BOOLEAN DEFAULT false,
    hidden_charge_allocation TEXT,
    portal_show_per_guest_price BOOLEAN DEFAULT false,
    portal_hide_discount BOOLEAN DEFAULT false,
    portal_starting_from_mode BOOLEAN DEFAULT false,
    portal_show_balance_due BOOLEAN DEFAULT false,
    portal_label_subtotal TEXT,
    portal_label_service_charge TEXT,
    portal_label_tax TEXT,
    portal_label_total TEXT,
    portal_round_total_to NUMERIC,
    portal_package_only_mode BOOLEAN DEFAULT false,
    quote_hide_recipe_lines BOOLEAN DEFAULT false,
    portal_hide_internal_notes BOOLEAN DEFAULT false,
    head_chef_employee_id TEXT,
    requisition_flow_enabled BOOLEAN DEFAULT false,
    extra_items_limit_percent TEXT
);

-- Entity: CateringStaffFeedback -> Table: catering_staff_feedback

CREATE TABLE IF NOT EXISTS catering_staff_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    assignment_id TEXT,
    employee_id TEXT,
    employee_name TEXT,
    role_name TEXT,
    rating NUMERIC,
    comment TEXT,
    reviewed_by TEXT,
    reviewed_date TIMESTAMPTZ,
    source TEXT,
    custody_checkpoint_id TEXT,
    review_status TEXT
);

-- Entity: CateringStaffingRole -> Table: catering_staffing_role

CREATE TABLE IF NOT EXISTS catering_staffing_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    matches_positions JSONB DEFAULT '[]'::jsonb,
    department TEXT,
    guests_per_staff NUMERIC,
    min_count NUMERIC,
    is_critical BOOLEAN DEFAULT false,
    required_skills JSONB DEFAULT '[]'::jsonb,
    pay_basis TEXT,
    default_hourly_rate NUMERIC,
    default_flat_rate NUMERIC,
    applies_to_event_types JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT false,
    sort_order NUMERIC
);

-- Entity: CateringTransferProof -> Table: catering_transfer_proof

CREATE TABLE IF NOT EXISTS catering_transfer_proof (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    client_id TEXT,
    client_name TEXT,
    transfer_type TEXT,
    amount NUMERIC,
    method TEXT,
    reference TEXT,
    screenshot_url TEXT,
    transfer_date DATE,
    status TEXT,
    submitted_by TEXT,
    reviewed_by TEXT,
    reviewed_date TIMESTAMPTZ,
    review_note TEXT,
    notes TEXT
);

-- Entity: CateringTrip -> Table: catering_trip

CREATE TABLE IF NOT EXISTS catering_trip (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    trip_label TEXT,
    vehicle_id TEXT,
    vehicle_name TEXT,
    vehicle_plate TEXT,
    vehicle_conflict_override BOOLEAN DEFAULT false,
    vehicle_conflict_detail TEXT,
    override_by TEXT,
    override_reason TEXT,
    driver_assignment_id TEXT,
    driver_employee_id TEXT,
    driver_name TEXT,
    custody_assignments JSONB DEFAULT '[]'::jsonb,
    custody_confirmed_stages JSONB DEFAULT '[]'::jsonb,
    stage TEXT,
    loading_started_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    returning_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    destination_label TEXT,
    destination_address TEXT,
    destination_lat NUMERIC,
    destination_lng NUMERIC,
    checklist JSONB DEFAULT '[]'::jsonb,
    cost_basis TEXT,
    distance_km NUMERIC,
    cost_per_km NUMERIC,
    days_used NUMERIC,
    cost_per_day NUMERIC,
    extra_cost NUMERIC,
    estimated_transport_cost NUMERIC,
    discrepancy_count NUMERIC,
    return_notes TEXT,
    cancel_reason TEXT,
    notes TEXT
);

-- Entity: CateringVehicle -> Table: catering_vehicle

CREATE TABLE IF NOT EXISTS catering_vehicle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    plate_number TEXT,
    vehicle_type TEXT,
    capacity_notes TEXT,
    home_branch_id TEXT,
    home_branch_name TEXT,
    status TEXT,
    cost_basis TEXT,
    cost_per_km NUMERIC,
    cost_per_day NUMERIC,
    notes TEXT
);

-- Entity: Client -> Table: client

CREATE TABLE IF NOT EXISTS client (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    client_type TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    location_lat NUMERIC,
    location_lng NUMERIC,
    client_source TEXT,
    national_id_url TEXT,
    referred_by TEXT,
    total_spent NUMERIC,
    cashback_earned NUMERIC,
    cashback_consumed NUMERIC,
    welcome_cashback_balance NUMERIC,
    available_payout NUMERIC,
    consumed_payout NUMERIC,
    payout_earned NUMERIC,
    total_payout NUMERIC,
    visits_count NUMERIC,
    status TEXT,
    referral_code TEXT,
    notes TEXT,
    current_tier_id TEXT,
    current_tier_name TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    daily_withdrawal_limit NUMERIC,
    weekly_withdrawal_limit NUMERIC,
    monthly_withdrawal_limit NUMERIC,
    loyalty_tier_id TEXT,
    loyalty_tier_name TEXT,
    registration_level_id TEXT,
    registration_level_name TEXT,
    wallet_balance NUMERIC,
    total_recharged NUMERIC,
    recharge_tier_id TEXT,
    recharge_tier_name TEXT,
    is_recharge_user BOOLEAN DEFAULT false,
    loyalty_program_enrolled BOOLEAN DEFAULT false,
    last_balance_reminder_sent TIMESTAMPTZ,
    owner_employee_id TEXT,
    owner_name TEXT,
    catering_credit_limit NUMERIC,
    is_merged BOOLEAN DEFAULT false,
    merged_into_id TEXT,
    merged_into_name TEXT,
    merged_at TIMESTAMPTZ,
    merged_by_email TEXT
);

-- Entity: ClientInteraction -> Table: client_interaction

CREATE TABLE IF NOT EXISTS client_interaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    client_name TEXT,
    interaction_type TEXT,
    note TEXT,
    occurred_at TIMESTAMPTZ,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_completed_at TIMESTAMPTZ,
    created_by_email TEXT,
    created_by_name TEXT
);

-- Entity: ClientSegment -> Table: client_segment

CREATE TABLE IF NOT EXISTS client_segment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    min_total_spent NUMERIC,
    max_total_spent NUMERIC,
    min_visits NUMERIC,
    dormant_days NUMERIC,
    registered_within_days NUMERIC,
    client_source TEXT,
    status TEXT,
    loyalty_tier_name TEXT,
    owner_employee_id TEXT,
    owner_filter_name TEXT,
    created_by_email TEXT
);

-- Entity: ContactRateLimit -> Table: contact_rate_limit

CREATE TABLE IF NOT EXISTS contact_rate_limit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    visitor_key TEXT,
    submitted_at TIMESTAMPTZ
);

-- Entity: DailyFinancialSummary -> Table: daily_financial_summary

CREATE TABLE IF NOT EXISTS daily_financial_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    business_date DATE,
    cashier_session_id TEXT,
    total_revenue NUMERIC,
    catering_revenue NUMERIC,
    catering_payment_count NUMERIC,
    food_revenue NUMERIC,
    beverage_revenue NUMERIC,
    total_food_cost NUMERIC,
    total_beverage_cost NUMERIC,
    total_cogs NUMERIC,
    food_cost_percentage NUMERIC,
    beverage_cost_percentage NUMERIC,
    overall_cogs_percentage NUMERIC,
    gross_profit NUMERIC,
    gross_profit_margin NUMERIC,
    operating_expenses NUMERIC,
    labor_cost NUMERIC,
    operating_profit NUMERIC,
    operating_margin_percentage NUMERIC,
    number_of_covers NUMERIC,
    average_check NUMERIC,
    notes TEXT
);

-- Entity: DeliveryBonusRecord -> Table: delivery_bonus_record

CREATE TABLE IF NOT EXISTS delivery_bonus_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    delivery_person_id TEXT,
    delivery_person_name TEXT,
    bonus_tier_id TEXT,
    bonus_tier_name TEXT,
    milestone_count NUMERIC,
    bonus_amount NUMERIC,
    total_deliveries_at_time NUMERIC,
    trigger_order_id TEXT,
    status TEXT,
    earned_date TIMESTAMPTZ,
    paid_date TIMESTAMPTZ,
    notes TEXT
);

-- Entity: DeliveryBonusTier -> Table: delivery_bonus_tier

CREATE TABLE IF NOT EXISTS delivery_bonus_tier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    milestone_count NUMERIC,
    bonus_amount NUMERIC,
    is_active BOOLEAN DEFAULT false,
    description TEXT,
    recurrence_type TEXT
);

-- Entity: DeliveryCompany -> Table: delivery_company

CREATE TABLE IF NOT EXISTS delivery_company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    delivery_type TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    commission_percentage NUMERIC,
    is_subject_to_tax BOOLEAN DEFAULT false,
    additional_fee_type TEXT,
    additional_fee_value NUMERIC,
    allow_manual_discount BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    color TEXT
);

-- Entity: DeliveryMessage -> Table: delivery_message

CREATE TABLE IF NOT EXISTS delivery_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    order_id TEXT,
    order_label TEXT,
    sender_name TEXT,
    sender_email TEXT,
    message_text TEXT,
    message_type TEXT,
    status_value TEXT,
    delivery_company_name TEXT
);

-- Entity: DeliveryPerson -> Table: delivery_person

CREATE TABLE IF NOT EXISTS delivery_person (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    vehicle_type TEXT,
    vehicle_number TEXT,
    status TEXT,
    current_orders NUMERIC,
    total_deliveries NUMERIC,
    rating NUMERIC,
    assigned_zones JSONB DEFAULT '[]'::jsonb,
    total_bonus_earnings NUMERIC
);

-- Entity: DeliveryReceiptCompliance -> Table: delivery_receipt_compliance

CREATE TABLE IF NOT EXISTS delivery_receipt_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    order_id TEXT,
    session_id TEXT,
    branch_id TEXT,
    branch_name TEXT,
    delivery_company_id TEXT,
    delivery_company_name TEXT,
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    receipt_url TEXT,
    scanned_payment_method TEXT,
    pos_payment_method TEXT,
    expected_pos_payment_method TEXT,
    is_compliant BOOLEAN DEFAULT false,
    compliance_status TEXT,
    order_total NUMERIC,
    cashier_name TEXT,
    report_sent BOOLEAN DEFAULT false,
    notes TEXT
);

-- Entity: DeliveryZone -> Table: delivery_zone

CREATE TABLE IF NOT EXISTS delivery_zone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    description TEXT,
    delivery_fee NUMERIC,
    company_specific_fees JSONB DEFAULT '{}'::jsonb,
    estimated_time NUMERIC,
    is_active BOOLEAN DEFAULT false,
    color TEXT,
    areas JSONB DEFAULT '[]'::jsonb
);

-- Entity: Department -> Table: department

CREATE TABLE IF NOT EXISTS department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    positions JSONB DEFAULT '[]'::jsonb,
    user_roles JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT false,
    notes TEXT
);

-- Entity: Deposit -> Table: deposit

CREATE TABLE IF NOT EXISTS deposit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    session_id TEXT,
    deposit_date TIMESTAMPTZ,
    amount NUMERIC,
    payment_method TEXT,
    source TEXT,
    reference_number TEXT,
    notes TEXT
);

-- Entity: DisciplinaryAction -> Table: disciplinary_action

CREATE TABLE IF NOT EXISTS disciplinary_action (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    employee_id TEXT,
    employee_name TEXT,
    action_type TEXT,
    action_date DATE,
    reason TEXT,
    details TEXT,
    outcome TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    recorded_by TEXT
);

-- Entity: EmailNotificationSettings -> Table: email_notification_settings

CREATE TABLE IF NOT EXISTS email_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    setting_key TEXT,
    registration_approved BOOLEAN DEFAULT false,
    registration_rejected BOOLEAN DEFAULT false,
    payout_approved BOOLEAN DEFAULT false,
    payout_rejected BOOLEAN DEFAULT false,
    tier_upgrade BOOLEAN DEFAULT false,
    new_rewards BOOLEAN DEFAULT false,
    order_placed BOOLEAN DEFAULT false,
    order_confirmed BOOLEAN DEFAULT false,
    order_completed BOOLEAN DEFAULT false,
    redemption_processed BOOLEAN DEFAULT false,
    milestone_achieved BOOLEAN DEFAULT false,
    purchase_approved BOOLEAN DEFAULT false,
    purchase_rejected BOOLEAN DEFAULT false,
    referral_registered BOOLEAN DEFAULT false,
    rsvp_entry_pass BOOLEAN DEFAULT false
);

-- Entity: Employee -> Table: employee

CREATE TABLE IF NOT EXISTS employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    employee_id TEXT,
    position TEXT,
    department TEXT,
    invite_sent_at TIMESTAMPTZ,
    employment_type TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    catering_events_worked NUMERIC,
    largest_event_guests NUMERIC,
    hire_date DATE,
    salary_type TEXT,
    status TEXT
);

-- Entity: EmployeeBorrowing -> Table: employee_borrowing

CREATE TABLE IF NOT EXISTS employee_borrowing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    employee_id TEXT,
    employee_name TEXT,
    amount NUMERIC,
    reason TEXT,
    borrow_date DATE,
    repayment_type TEXT,
    installment_months NUMERIC,
    amount_per_installment NUMERIC,
    start_repayment_month DATE,
    total_repaid NUMERIC,
    remaining_balance NUMERIC,
    status TEXT,
    notes TEXT,
    request_status TEXT,
    requested_by_employee BOOLEAN DEFAULT false,
    decision_by TEXT,
    decision_date TIMESTAMPTZ,
    rejection_reason TEXT
);

-- Entity: EmployeePrivate -> Table: employee_private

CREATE TABLE IF NOT EXISTS employee_private (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    employee_record_id TEXT,
    employee_code TEXT,
    face_scan_data TEXT,
    hourly_rate NUMERIC,
    fixed_salary NUMERIC,
    bonus_structure JSONB DEFAULT '{}'::jsonb,
    current_month_earnings NUMERIC,
    total_hours_worked NUMERIC
);

-- Entity: ExEmployee -> Table: ex_employee

CREATE TABLE IF NOT EXISTS ex_employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    original_employee_id TEXT,
    employee_id TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    position TEXT,
    department TEXT,
    branch_id TEXT,
    branch_name TEXT,
    employment_type TEXT,
    hire_date TEXT,
    salary_type TEXT,
    hourly_rate NUMERIC,
    fixed_salary NUMERIC,
    last_status TEXT,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

-- Entity: Expense -> Table: expense

CREATE TABLE IF NOT EXISTS expense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    session_id TEXT,
    expense_date TIMESTAMPTZ,
    category TEXT,
    amount NUMERIC,
    description TEXT,
    recipient TEXT,
    payment_method TEXT,
    receipt_url TEXT,
    status TEXT,
    approved_by TEXT,
    rejection_reason TEXT,
    submitted_by TEXT
);

-- Entity: ExpiryReport -> Table: expiry_report

CREATE TABLE IF NOT EXISTS expiry_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    inventory_item_id TEXT,
    inventory_item_name TEXT,
    category_id TEXT,
    category_name TEXT,
    batch_ref TEXT,
    expiry_date DATE,
    quantity_at_risk NUMERIC,
    unit TEXT,
    estimated_value NUMERIC,
    status TEXT,
    resolved_quantity NUMERIC,
    resolved_at TIMESTAMPTZ,
    resolved_by_email TEXT,
    resolution_notes TEXT,
    notes TEXT,
    photo_url TEXT,
    reported_by_email TEXT,
    reported_by_name TEXT
);

-- Entity: FinanceAccount -> Table: finance_account

CREATE TABLE IF NOT EXISTS finance_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    account_key TEXT,
    company_id TEXT,
    code TEXT,
    name TEXT,
    parent_code TEXT,
    classification TEXT,
    normal_balance TEXT,
    posting BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT false,
    effective_from TEXT,
    effective_to TEXT,
    management_mapping TEXT,
    statutory_mapping TEXT,
    template_version TEXT,
    report_cash_equivalent TEXT,
    report_cash_flow_section TEXT
);

-- Entity: FinanceAuditEvent -> Table: finance_audit_event

CREATE TABLE IF NOT EXISTS finance_audit_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    company_id TEXT,
    branch_id TEXT,
    actor_id TEXT,
    actor_email TEXT,
    actor_name TEXT,
    actor_type TEXT,
    request_id TEXT,
    operation TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id TEXT,
    entity_label TEXT,
    before TEXT,
    after JSONB DEFAULT '{}'::jsonb,
    changed_fields JSONB DEFAULT '[]'::jsonb,
    reason TEXT,
    source_entity TEXT,
    source_id TEXT
);

-- Entity: FinanceBudget -> Table: finance_budget

CREATE TABLE IF NOT EXISTS finance_budget (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    budget_key TEXT,
    company_id TEXT,
    branch_id TEXT,
    year INTEGER,
    currency TEXT,
    status TEXT,
    revision INTEGER,
    basis TEXT,
    source_year INTEGER,
    missing_months JSONB DEFAULT '[]'::jsonb,
    values JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    prepared_by TEXT,
    approved_by TEXT,
    approved_at TEXT
);

-- Entity: FinanceCompany -> Table: finance_company

CREATE TABLE IF NOT EXISTS finance_company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    registration_number TEXT,
    currency TEXT,
    currency_decimals INTEGER,
    edition TEXT,
    branch_ids JSONB DEFAULT '[]'::jsonb,
    member_emails JSONB DEFAULT '[]'::jsonb,
    parent_company_id TEXT,
    closed_through TEXT,
    lock_reason TEXT,
    locked_by TEXT,
    locked_at TEXT,
    write_token TEXT,
    write_started_at TEXT,
    is_test BOOLEAN DEFAULT false,
    history_status TEXT,
    auto_post_enabled BOOLEAN DEFAULT false,
    auto_post_from TEXT,
    auto_account_map JSONB DEFAULT '{}'::jsonb,
    auto_source_currency TEXT,
    auto_configured_by TEXT,
    auto_configured_at TEXT,
    module_policy JSONB DEFAULT '{}'::jsonb
);

-- Entity: FinanceHealthAnalysis -> Table: finance_health_analysis

CREATE TABLE IF NOT EXISTS finance_health_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    company_id TEXT,
    branch_id TEXT,
    company_name TEXT,
    currency TEXT,
    currency_decimals INTEGER,
    is_test BOOLEAN DEFAULT false,
    started_at TEXT,
    completed_at TEXT,
    cutoff TEXT,
    from TEXT,
    to TEXT,
    timezone TEXT,
    version TEXT,
    source_url TEXT,
    source_sha256 TEXT,
    status TEXT,
    started_by_id TEXT,
    original_summary JSONB DEFAULT '{}'::jsonb,
    summary JSONB DEFAULT '{}'::jsonb,
    domains JSONB DEFAULT '{}'::jsonb,
    observations JSONB DEFAULT '{}'::jsonb,
    limitations JSONB DEFAULT '[]'::jsonb,
    error TEXT,
    lock_token TEXT,
    last_review_at TEXT
);

-- Entity: FinanceHealthFinding -> Table: finance_health_finding

CREATE TABLE IF NOT EXISTS finance_health_finding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    analysis_id TEXT,
    company_id TEXT,
    branch_id TEXT,
    control_id TEXT,
    domain INTEGER,
    domain_name TEXT,
    requirement TEXT,
    kind TEXT,
    initial_status TEXT,
    status TEXT,
    severity TEXT,
    expected TEXT,
    actual TEXT,
    evidence JSONB DEFAULT '{}'::jsonb,
    root_cause TEXT,
    impact TEXT,
    recommendation TEXT,
    ai_recommendation TEXT,
    owner TEXT,
    dependency TEXT,
    effort TEXT,
    retest TEXT,
    closure_status TEXT,
    pending_review_id TEXT,
    possible_points NUMERIC,
    earned_points NUMERIC,
    reviewed_points NUMERIC,
    test_required NUMERIC,
    test_executed NUMERIC,
    reconciliation_required NUMERIC,
    reconciliation_verified NUMERIC,
    reviewed_by_id TEXT,
    reviewed_at TEXT
);

-- Entity: FinanceHealthReview -> Table: finance_health_review

CREATE TABLE IF NOT EXISTS finance_health_review (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    analysis_id TEXT,
    company_id TEXT,
    branch_id TEXT,
    finding_id TEXT,
    submitted_by_id TEXT,
    proposed_status TEXT,
    previous_status TEXT,
    evidence_note TEXT,
    evidence_type TEXT,
    actual TEXT,
    impact TEXT,
    remediation_note TEXT,
    owner TEXT,
    status TEXT,
    reviewed_by_id TEXT,
    reviewed_at TEXT,
    decision_note TEXT
);

-- Entity: FinanceJournal -> Table: finance_journal

CREATE TABLE IF NOT EXISTS finance_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    company_id TEXT,
    branch_id TEXT,
    proposal_id TEXT,
    posting_key TEXT,
    status TEXT,
    entry_date DATE,
    description TEXT,
    kind TEXT,
    currency TEXT,
    business_edition TEXT,
    source_id TEXT,
    source_entity TEXT,
    source_version TEXT,
    source_summary JSONB DEFAULT '{}'::jsonb,
    reversal_of TEXT,
    lines JSONB DEFAULT '[]'::jsonb,
    total_debit NUMERIC,
    total_credit NUMERIC,
    prepared_by TEXT,
    prepared_by_id TEXT,
    reviewed_by TEXT,
    reviewed_by_id TEXT,
    reviewed_at TEXT,
    review_note TEXT,
    rule_version TEXT,
    evidence_note TEXT,
    is_test BOOLEAN DEFAULT false,
    ledger_ready BOOLEAN DEFAULT false,
    analytics_version INTEGER
);

-- Entity: FinanceLedgerLine -> Table: finance_ledger_line

CREATE TABLE IF NOT EXISTS finance_ledger_line (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    line_key TEXT,
    company_id TEXT,
    branch_id TEXT,
    journal_id TEXT,
    entry_date DATE,
    account_code TEXT,
    account_name TEXT,
    classification TEXT,
    debit_units NUMERIC,
    credit_units NUMERIC,
    cash_units NUMERIC,
    cash_operating NUMERIC,
    cash_investing NUMERIC,
    cash_financing NUMERIC,
    cash_unclassified NUMERIC,
    cash_opening NUMERIC,
    service_type TEXT,
    order_origin TEXT,
    delivery_partner_id TEXT
);

-- Entity: FinanceManualStatus -> Table: finance_manual_status

CREATE TABLE IF NOT EXISTS finance_manual_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    manual_key TEXT,
    content_version TEXT,
    generated_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ,
    section_count INTEGER,
    report_count INTEGER
);

-- Entity: FinancePostingIssue -> Table: finance_posting_issue

CREATE TABLE IF NOT EXISTS finance_posting_issue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    issue_key TEXT,
    company_id TEXT,
    branch_id TEXT,
    source_id TEXT,
    source_entity TEXT,
    source_description TEXT,
    entry_date TEXT,
    status TEXT,
    message TEXT,
    last_attempt_at TEXT,
    resolved_at TEXT
);

-- Entity: FinanceProposal -> Table: finance_proposal

CREATE TABLE IF NOT EXISTS finance_proposal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    company_id TEXT,
    branch_id TEXT,
    entry_date DATE,
    description TEXT,
    kind TEXT,
    source_key TEXT,
    source_id TEXT,
    source_entity TEXT,
    source_version TEXT,
    source_summary JSONB DEFAULT '{}'::jsonb,
    currency TEXT,
    business_edition TEXT,
    lines JSONB DEFAULT '[]'::jsonb,
    total_debit NUMERIC,
    total_credit NUMERIC,
    prepared_by TEXT,
    prepared_by_id TEXT,
    rule_version TEXT,
    evidence_note TEXT,
    status TEXT,
    decision_id TEXT
);

-- Entity: FinanceTaxAssessment -> Table: finance_tax_assessment

CREATE TABLE IF NOT EXISTS finance_tax_assessment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    company_id TEXT,
    branch_id TEXT,
    kind TEXT,
    direction TEXT,
    assessment_key TEXT,
    source_entity TEXT,
    source_id TEXT,
    source_version TEXT,
    source_label TEXT,
    entry_date DATE,
    period_start TEXT,
    period_end TEXT,
    currency TEXT,
    revision INTEGER,
    request_id TEXT,
    request_signature TEXT,
    rule_ids JSONB DEFAULT '[]'::jsonb,
    counterparty_name TEXT,
    counterparty_tax_id TEXT,
    employee_id TEXT,
    lines JSONB DEFAULT '[]'::jsonb,
    base_units INTEGER,
    vat_units INTEGER,
    recoverable_units INTEGER,
    tax_units INTEGER,
    recorded_tax_units TEXT,
    recorded_tax_known BOOLEAN DEFAULT false,
    missing_counterparty_id BOOLEAN DEFAULT false,
    calculation JSONB DEFAULT '{}'::jsonb,
    evidence_note TEXT,
    prepared_by TEXT,
    prepared_at TEXT
);

-- Entity: FinanceTaxConfig -> Table: finance_tax_config

CREATE TABLE IF NOT EXISTS finance_tax_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    company_id TEXT,
    output_account_id TEXT,
    input_account_id TEXT,
    configured_by TEXT
);

-- Entity: FinanceTaxDocument -> Table: finance_tax_document

CREATE TABLE IF NOT EXISTS finance_tax_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    company_id TEXT,
    branch_id TEXT,
    branch_name TEXT,
    currency TEXT,
    record_key TEXT,
    request_id TEXT,
    request_signature TEXT,
    revision INTEGER,
    entry_date DATE,
    direction TEXT,
    document_type TEXT,
    invoice_number TEXT,
    original_reference TEXT,
    counterparty_name TEXT,
    counterparty_tax_id TEXT,
    taxable_units TEXT,
    vat_units TEXT,
    recoverable_units TEXT,
    vat_reviewed BOOLEAN DEFAULT false,
    signed_base_units INTEGER,
    output_units INTEGER,
    input_units INTEGER,
    purchase_vat_units INTEGER,
    evidence_note TEXT,
    eta_status TEXT,
    eta_uuid TEXT,
    submission_uuid TEXT,
    status_checked_date DATE,
    status_note TEXT,
    status_recorded_by TEXT,
    status_recorded_at TEXT,
    vat_recorded_by TEXT,
    vat_recorded_at TEXT
);

-- Entity: FinanceTaxRule -> Table: finance_tax_rule

CREATE TABLE IF NOT EXISTS finance_tax_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    company_id TEXT,
    kind TEXT,
    code TEXT,
    name TEXT,
    version INTEGER,
    direction TEXT,
    effective_from DATE,
    effective_to TEXT,
    rate NUMERIC,
    annual_relief_units INTEGER,
    annual_income_min_units INTEGER,
    annual_income_max_units TEXT,
    brackets JSONB DEFAULT '[]'::jsonb,
    legal_reference TEXT,
    exemption_reason TEXT,
    configured_by TEXT,
    request_id TEXT,
    request_signature TEXT
);

-- Entity: FinanceVarianceAlertConfig -> Table: finance_variance_alert_config

CREATE TABLE IF NOT EXISTS finance_variance_alert_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    setting_key TEXT,
    owner_user_id TEXT,
    enabled BOOLEAN DEFAULT false,
    threshold_pp NUMERIC,
    targets JSONB DEFAULT '[]'::jsonb,
    revision TEXT,
    last_checked_at TEXT,
    last_period TEXT,
    last_outcome TEXT,
    last_note TEXT,
    delivery_week TEXT,
    delivery_state TEXT,
    delivery_token TEXT
);

-- Entity: FoodCostCalculation -> Table: food_cost_calculation

CREATE TABLE IF NOT EXISTS food_cost_calculation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    order_id TEXT,
    order_date TIMESTAMPTZ,
    menu_item_id TEXT,
    menu_item_name TEXT,
    menu_item_category TEXT,
    quantity_ordered NUMERIC,
    selling_price NUMERIC,
    total_selling_price NUMERIC,
    recipe_items JSONB DEFAULT '[]'::jsonb,
    total_food_cost NUMERIC,
    food_cost_percentage NUMERIC,
    contribution_margin NUMERIC,
    contribution_margin_percentage NUMERIC
);

-- Entity: GLAccount -> Table: glaccount

CREATE TABLE IF NOT EXISTS glaccount (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    account_number TEXT,
    account_name TEXT,
    category TEXT,
    sub_category TEXT,
    account_type TEXT,
    is_active BOOLEAN DEFAULT false,
    description TEXT
);

-- Entity: InventoryCategory -> Table: inventory_category

CREATE TABLE IF NOT EXISTS inventory_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    description TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT false
);

-- Entity: InventoryItem -> Table: inventory_item

CREATE TABLE IF NOT EXISTS inventory_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    arabic_name TEXT,
    category_id TEXT,
    category_name TEXT,
    quantity NUMERIC,
    unit TEXT,
    purchase_unit TEXT,
    purchase_unit_label TEXT,
    selling_unit TEXT,
    selling_unit_label TEXT,
    low_stock_threshold NUMERIC,
    cost_per_unit NUMERIC,
    supplier_id TEXT,
    supplier TEXT,
    expiry_date DATE,
    lead_time_days NUMERIC,
    storage_location_id TEXT,
    storage_location_name TEXT
);

-- Entity: JobRunLog -> Table: job_run_log

CREATE TABLE IF NOT EXISTS job_run_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    job_key TEXT,
    slot_key TEXT,
    caller TEXT,
    outcome TEXT,
    reason TEXT,
    ran_at TIMESTAMPTZ
);

-- Entity: JournalEntry -> Table: journal_entry

CREATE TABLE IF NOT EXISTS journal_entry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    entry_date TIMESTAMPTZ,
    reference_type TEXT,
    reference_id TEXT,
    revenue_source TEXT,
    catering_event_id TEXT,
    catering_event_name TEXT,
    description TEXT,
    entries JSONB DEFAULT '[]'::jsonb,
    total_debit NUMERIC,
    total_credit NUMERIC,
    is_balanced BOOLEAN DEFAULT false,
    posted BOOLEAN DEFAULT false
);

-- Entity: KitchenItemAssignment -> Table: kitchen_item_assignment

CREATE TABLE IF NOT EXISTS kitchen_item_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    event_id TEXT,
    quote_id TEXT,
    item_key TEXT,
    item_name TEXT,
    employee_id TEXT,
    employee_name TEXT
);

-- Entity: KitchenManual -> Table: kitchen_manual

CREATE TABLE IF NOT EXISTS kitchen_manual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    section_key TEXT,
    section_number TEXT,
    section_title_en TEXT,
    section_title_ar TEXT,
    section_type TEXT,
    main_category TEXT,
    item_category TEXT,
    branch_id TEXT,
    branch_name TEXT,
    language TEXT,
    status TEXT,
    content_en JSONB DEFAULT '{}'::jsonb,
    content_ar JSONB DEFAULT '{}'::jsonb,
    menu_item_id TEXT,
    menu_item_name TEXT,
    menu_category TEXT,
    dine_in_images JSONB DEFAULT '[]'::jsonb,
    delivery_images JSONB DEFAULT '[]'::jsonb,
    prepared_by TEXT,
    reviewed_by TEXT,
    approved_by TEXT,
    approved_date DATE,
    version TEXT,
    effective_date DATE,
    next_review_date DATE,
    notes TEXT,
    sort_order NUMERIC
);

-- Entity: KitchenPurchaseRequest -> Table: kitchen_purchase_request

CREATE TABLE IF NOT EXISTS kitchen_purchase_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    production_order_id TEXT,
    recipe_name TEXT,
    batches NUMERIC,
    catering_event_id TEXT,
    catering_event_name TEXT,
    needed_by_date TEXT,
    inventory_item_id TEXT,
    inventory_item_name TEXT,
    quantity_needed NUMERIC,
    quantity_available NUMERIC,
    quantity_requested NUMERIC,
    unit TEXT,
    note TEXT,
    status TEXT,
    purchase_order_id TEXT,
    purchase_order_number TEXT,
    requested_by TEXT,
    requested_at TIMESTAMPTZ,
    handled_by TEXT,
    handled_at TIMESTAMPTZ,
    resolution_note TEXT
);

-- Entity: KitchenReleaseSlip -> Table: kitchen_release_slip

CREATE TABLE IF NOT EXISTS kitchen_release_slip (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    slip_number TEXT,
    needed_by_date DATE,
    status TEXT,
    shortfall_count NUMERIC,
    lines JSONB DEFAULT '[]'::jsonb,
    created_from_quote_id TEXT,
    fulfilled_by TEXT,
    fulfilled_date TIMESTAMPTZ,
    received_by TEXT,
    received_by_name TEXT,
    received_date TIMESTAMPTZ,
    receipt_comment TEXT,
    not_received_at_closeout BOOLEAN DEFAULT false,
    voided_by TEXT,
    voided_date TIMESTAMPTZ,
    void_reason TEXT,
    migrated_to_requisition BOOLEAN DEFAULT false,
    migrated_date TIMESTAMPTZ,
    requisition_id TEXT,
    requisition_number TEXT,
    batch_number NUMERIC,
    is_requisition_batch BOOLEAN DEFAULT false
);

-- Entity: Lead -> Table: lead

CREATE TABLE IF NOT EXISTS lead (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    lead_number TEXT,
    external_id TEXT,
    platform TEXT,
    brand_purpose TEXT,
    priority NUMERIC,
    priority_label TEXT,
    contact_username TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    campaign TEXT,
    source TEXT,
    sender_name TEXT,
    phone_number TEXT,
    message_text TEXT,
    referrer_name TEXT,
    referrer_phone TEXT,
    referrer_email TEXT,
    referrer_event_name TEXT,
    referrer_event_id TEXT,
    status TEXT,
    converted_client_id TEXT,
    converted_client_name TEXT,
    converted_date TIMESTAMPTZ,
    converted_by_email TEXT,
    conversion_mode TEXT,
    notes TEXT,
    governorate TEXT,
    address TEXT
);

-- Entity: LeadSourceMapping -> Table: lead_source_mapping

CREATE TABLE IF NOT EXISTS lead_source_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    lead_source TEXT,
    brand_name TEXT,
    brand_type TEXT,
    description TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT false
);

-- Entity: LevelUpgradeRequest -> Table: level_upgrade_request

CREATE TABLE IF NOT EXISTS level_upgrade_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    client_name TEXT,
    client_email TEXT,
    current_level_name TEXT,
    requested_level_id TEXT,
    requested_level_name TEXT,
    registration_fee NUMERIC,
    welcome_cashback_percentage NUMERIC,
    payment_receipt_url TEXT,
    status TEXT,
    rejection_reason TEXT
);

-- Entity: LoyaltyTier -> Table: loyalty_tier

CREATE TABLE IF NOT EXISTS loyalty_tier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    tier_name TEXT,
    tier_level NUMERIC,
    min_cashback_earned NUMERIC,
    min_successful_payouts NUMERIC,
    payout_percentage_bonus NUMERIC,
    min_payout_reduction NUMERIC,
    priority_support BOOLEAN DEFAULT false,
    exclusive_promotions BOOLEAN DEFAULT false,
    color TEXT,
    icon TEXT,
    description TEXT
);

-- Entity: MarketingCampaign -> Table: marketing_campaign

CREATE TABLE IF NOT EXISTS marketing_campaign (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    type TEXT,
    trigger_type TEXT,
    target_audience TEXT,
    tier_filter JSONB DEFAULT '[]'::jsonb,
    subject TEXT,
    message TEXT,
    cta_text TEXT,
    cta_url TEXT,
    is_active BOOLEAN DEFAULT false,
    is_automated BOOLEAN DEFAULT false,
    delay_days NUMERIC,
    recipients_count NUMERIC,
    sent_count NUMERIC,
    last_sent_date TIMESTAMPTZ
);

-- Entity: MenuCategory -> Table: menu_category

CREATE TABLE IF NOT EXISTS menu_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    description TEXT,
    section_id TEXT,
    section_name TEXT,
    sort_order NUMERIC,
    is_active BOOLEAN DEFAULT false,
    image_url TEXT,
    visible_website BOOLEAN DEFAULT false,
    visible_pos BOOLEAN DEFAULT false,
    tax_exempt BOOLEAN DEFAULT false,
    service_exempt BOOLEAN DEFAULT false
);

-- Entity: MenuItem -> Table: menu_item

CREATE TABLE IF NOT EXISTS menu_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    description TEXT,
    price NUMERIC,
    indirect_price NUMERIC,
    image_url TEXT,
    category TEXT,
    available BOOLEAN DEFAULT false,
    sell_priority TEXT,
    steering_note TEXT,
    steering_updated_by TEXT,
    steering_updated_at TIMESTAMPTZ,
    preparation_station TEXT,
    recipe JSONB DEFAULT '[]'::jsonb,
    size_recipes JSONB DEFAULT '{}'::jsonb,
    target_margin_percentage NUMERIC,
    total_cost NUMERIC,
    sizes JSONB DEFAULT '[]'::jsonb,
    visible_website BOOLEAN DEFAULT false,
    visible_pos BOOLEAN DEFAULT false,
    tax_exempt BOOLEAN DEFAULT false,
    service_exempt BOOLEAN DEFAULT false,
    manual_entry_id TEXT,
    manual_complete BOOLEAN DEFAULT false
);

-- Entity: MenuItemOption -> Table: menu_item_option

CREATE TABLE IF NOT EXISTS menu_item_option (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    menu_item_id TEXT,
    menu_item_name TEXT,
    option_id TEXT,
    option_name TEXT,
    required_for_item BOOLEAN DEFAULT false
);

-- Entity: MenuOption -> Table: menu_option

CREATE TABLE IF NOT EXISTS menu_option (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    option_type TEXT,
    max_selections NUMERIC,
    is_mandatory BOOLEAN DEFAULT false,
    values JSONB DEFAULT '[]'::jsonb,
    required_for_order BOOLEAN DEFAULT false,
    sort_order NUMERIC,
    is_active BOOLEAN DEFAULT false,
    is_combo_drink BOOLEAN DEFAULT false
);

-- Entity: MenuProfitabilityAnalysis -> Table: menu_profitability_analysis

CREATE TABLE IF NOT EXISTS menu_profitability_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    menu_item_id TEXT,
    menu_item_name TEXT,
    category TEXT,
    item_type TEXT,
    analysis_period_start DATE,
    analysis_period_end DATE,
    units_sold NUMERIC,
    selling_price NUMERIC,
    average_unit_food_cost NUMERIC,
    total_revenue NUMERIC,
    total_food_cost NUMERIC,
    total_contribution NUMERIC,
    average_food_cost_percentage NUMERIC,
    average_contribution_margin_percentage NUMERIC,
    profitability_status TEXT,
    menu_mix_percentage NUMERIC,
    recommended_action TEXT
);

-- Entity: MenuSection -> Table: menu_section

CREATE TABLE IF NOT EXISTS menu_section (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    description TEXT,
    sort_order NUMERIC,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    visible_website BOOLEAN DEFAULT false,
    visible_pos BOOLEAN DEFAULT false,
    tax_exempt BOOLEAN DEFAULT false,
    service_exempt BOOLEAN DEFAULT false
);

-- Entity: MilestoneAchievement -> Table: milestone_achievement

CREATE TABLE IF NOT EXISTS milestone_achievement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    client_name TEXT,
    milestone_id TEXT,
    milestone_name TEXT,
    bonus_awarded NUMERIC,
    referrals_count NUMERIC
);

-- Entity: Notification -> Table: notification

CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    recipient_type TEXT,
    client_id TEXT,
    client_email TEXT,
    employee_id TEXT,
    user_id TEXT,
    title TEXT,
    message TEXT,
    type TEXT,
    entity_type TEXT,
    entity_id TEXT,
    link_url TEXT,
    read BOOLEAN DEFAULT false,
    icon TEXT
);

-- Entity: OperationalMeeting -> Table: operational_meeting

CREATE TABLE IF NOT EXISTS operational_meeting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    title TEXT,
    meeting_date DATE,
    meeting_time TEXT,
    status TEXT,
    agenda TEXT,
    notes TEXT,
    root_causes TEXT,
    attendees JSONB DEFAULT '[]'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    recorded_by TEXT
);

-- Entity: Order -> Table: "order"

CREATE TABLE IF NOT EXISTS "order" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    order_type TEXT,
    table_id TEXT,
    table_number TEXT,
    delivery_address_id TEXT,
    delivery_address JSONB DEFAULT '{}'::jsonb,
    delivery_person_id TEXT,
    delivery_person_name TEXT,
    delivery_company_id TEXT,
    delivery_company_name TEXT,
    delivery_zone_id TEXT,
    delivery_zone_name TEXT,
    delivery_fee NUMERIC,
    is_pro_delivery BOOLEAN DEFAULT false,
    items JSONB DEFAULT '[]'::jsonb,
    offer_slots JSONB DEFAULT '[]'::jsonb,
    voice_order_id TEXT,
    total NUMERIC,
    subtotal NUMERIC,
    tax NUMERIC,
    service_charge NUMERIC,
    discount_amount NUMERIC,
    promo_code_id TEXT,
    promo_code TEXT,
    status TEXT,
    payment_method TEXT,
    visa_amount NUMERIC,
    secondary_payment_method TEXT,
    secondary_amount NUMERIC,
    cashback_used NUMERIC,
    payment_receipt_url TEXT,
    stripe_payment_intent_id TEXT,
    stripe_payment_status TEXT,
    notes TEXT,
    cashback_distributed BOOLEAN DEFAULT false,
    recharge_balance_before NUMERIC,
    recharge_balance_deducted NUMERIC,
    recharge_balance_after NUMERIC,
    consumed_balance_sofar NUMERIC,
    receipt_usage_type TEXT,
    auto_cashback_generated BOOLEAN DEFAULT false,
    cashback_excluded_by_admin BOOLEAN DEFAULT false,
    cashback_exclusion_reason TEXT,
    delivery_status TEXT,
    delivery_acknowledged_at TIMESTAMPTZ,
    delivery_picked_up_at TIMESTAMPTZ,
    delivery_delivered_at TIMESTAMPTZ,
    delivery_acknowledged_by TEXT,
    kitchen_ready_at TIMESTAMPTZ,
    applied_offer_discount NUMERIC,
    applied_offer_name TEXT,
    applied_offer_type TEXT,
    applied_offer_free_item TEXT,
    applied_offer_discounted_item TEXT,
    applied_offer_discount_pct NUMERIC,
    applied_offers_detail TEXT,
    global_discount_amount NUMERIC,
    manual_discount_percent NUMERIC,
    manual_discount_fixed NUMERIC,
    manual_discount_mode TEXT,
    minimum_charge_per_guest NUMERIC,
    minimum_charge_guests NUMERIC,
    minimum_charge_total NUMERIC,
    minimum_charge_adjustment NUMERIC,
    split_check JSONB DEFAULT '{}'::jsonb
);

-- Entity: OrderChangeLog -> Table: order_change_log

CREATE TABLE IF NOT EXISTS order_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    order_id TEXT,
    order_reference TEXT,
    table_id TEXT,
    table_number TEXT,
    session_id TEXT,
    change_type TEXT,
    item_name TEXT,
    previous_quantity NUMERIC,
    new_quantity NUMERIC,
    previous_value TEXT,
    new_value TEXT,
    order_total NUMERIC,
    customer_name TEXT,
    details TEXT,
    cashier_name TEXT,
    cashier_email TEXT
);

-- Entity: PageView -> Table: page_view

CREATE TABLE IF NOT EXISTS page_view (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    page_name TEXT,
    page_url TEXT,
    user_id TEXT,
    user_email TEXT,
    user_role TEXT,
    session_id TEXT,
    is_guest BOOLEAN DEFAULT false,
    duration_seconds NUMERIC,
    device_type TEXT,
    browser TEXT
);

-- Entity: Payout -> Table: payout

CREATE TABLE IF NOT EXISTS payout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    client_name TEXT,
    client_email TEXT,
    amount NUMERIC,
    payment_method TEXT,
    payment_details TEXT,
    status TEXT,
    rejection_reason TEXT,
    processed_by TEXT,
    transaction_reference TEXT,
    receipt_url TEXT
);

-- Entity: PayrollDisbursement -> Table: payroll_disbursement

CREATE TABLE IF NOT EXISTS payroll_disbursement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    month DATE,
    employee_id TEXT,
    employee_name TEXT,
    branch_id TEXT,
    branch_name TEXT,
    salary_record_id TEXT,
    amount NUMERIC,
    status TEXT,
    submitted_by TEXT,
    submitted_at TIMESTAMPTZ,
    confirmed_by TEXT,
    confirmed_at TIMESTAMPTZ
);

-- Entity: PayrollSettings -> Table: payroll_settings

CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    setting_key TEXT,
    payroll_cutoff_day TEXT
);

-- Entity: Payslip -> Table: payslip

CREATE TABLE IF NOT EXISTS payslip (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    employee_id TEXT,
    employee_name TEXT,
    employee_email TEXT,
    branch_id TEXT,
    branch_name TEXT,
    month DATE,
    net_salary NUMERIC,
    detail JSONB DEFAULT '{}'::jsonb,
    pdf_file_uri TEXT,
    status TEXT,
    generated_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    dispatched_by TEXT
);

-- Entity: PerformanceAppraisal -> Table: performance_appraisal

CREATE TABLE IF NOT EXISTS performance_appraisal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    employee_record_id TEXT,
    employee_name TEXT,
    branch_id TEXT,
    period_start DATE,
    period_end DATE,
    rating NUMERIC,
    assessment TEXT,
    goals TEXT,
    notes TEXT,
    status TEXT,
    proposed_by TEXT,
    proposed_by_id TEXT,
    proposed_at TIMESTAMPTZ,
    decided_by TEXT,
    decided_by_id TEXT,
    decided_at TIMESTAMPTZ,
    decision_note TEXT
);

-- Entity: PermissionSyncLog -> Table: permission_sync_log

CREATE TABLE IF NOT EXISTS permission_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    user_id TEXT,
    user_email TEXT,
    role TEXT,
    trigger TEXT,
    status TEXT,
    error_message TEXT,
    attempts NUMERIC,
    mismatch_before BOOLEAN DEFAULT false,
    mismatch_fields JSONB DEFAULT '[]'::jsonb,
    synced_at TIMESTAMPTZ
);

-- Entity: PreparationArea -> Table: preparation_area

CREATE TABLE IF NOT EXISTS preparation_area (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    key TEXT,
    icon_name TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT false,
    sort_order NUMERIC,
    printer_id TEXT,
    header_text TEXT,
    footer_text TEXT,
    font_size NUMERIC
);

-- Entity: PrimalCut -> Table: primal_cut

CREATE TABLE IF NOT EXISTS primal_cut (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    slaughter_event_id TEXT,
    animal_tag TEXT,
    cut_name TEXT,
    weight NUMERIC,
    weight_unit TEXT,
    yield_percentage NUMERIC,
    quality_grade TEXT,
    market_price_per_unit NUMERIC,
    allocation_method TEXT,
    allocated_cost NUMERIC,
    is_condemned BOOLEAN DEFAULT false,
    notes TEXT
);

-- Entity: Printer -> Table: printer

CREATE TABLE IF NOT EXISTS printer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    printer_ip TEXT,
    type TEXT,
    use_printnode BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT false,
    auto_print_on_order BOOLEAN DEFAULT false,
    receipt_width NUMERIC,
    font_size NUMERIC,
    font_name TEXT,
    print_kitchen_items BOOLEAN DEFAULT false,
    print_bar_items BOOLEAN DEFAULT false,
    restaurant_logo_url TEXT,
    receipt_header TEXT,
    receipt_footer TEXT,
    restaurant_address TEXT,
    restaurant_phone TEXT,
    restaurant_whatsapp TEXT,
    restaurant_hotline TEXT,
    restaurant_website TEXT,
    commercial_registration TEXT,
    tax_card TEXT,
    show_logo BOOLEAN DEFAULT false,
    show_address BOOLEAN DEFAULT false,
    show_phone BOOLEAN DEFAULT false,
    show_whatsapp BOOLEAN DEFAULT false,
    show_hotline BOOLEAN DEFAULT false,
    show_website BOOLEAN DEFAULT false,
    show_order_number BOOLEAN DEFAULT false,
    show_date_time BOOLEAN DEFAULT false,
    show_cashier BOOLEAN DEFAULT false,
    show_table_number BOOLEAN DEFAULT false,
    show_customer_name BOOLEAN DEFAULT false,
    show_payment_method BOOLEAN DEFAULT false,
    show_tax_breakdown BOOLEAN DEFAULT false,
    show_service_breakdown BOOLEAN DEFAULT false
);

-- Entity: ProcessingBatch -> Table: processing_batch

CREATE TABLE IF NOT EXISTS processing_batch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    batch_number TEXT,
    date DATE,
    branch_id TEXT,
    branch_name TEXT,
    animal_ids JSONB DEFAULT '[]'::jsonb,
    animal_count NUMERIC,
    labor_cost NUMERIC,
    overhead_cost NUMERIC,
    disposal_cost NUMERIC,
    total_shared_cost NUMERIC,
    cost_allocation_method TEXT,
    status TEXT,
    notes TEXT
);

-- Entity: ProductionOrder -> Table: production_order

CREATE TABLE IF NOT EXISTS production_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    recipe_id TEXT,
    recipe_name TEXT,
    output_item_id TEXT,
    output_item_name TEXT,
    target_quantity NUMERIC,
    actual_output_quantity NUMERIC,
    output_unit TEXT,
    status TEXT,
    branch_id TEXT,
    branch_name TEXT,
    order_source TEXT,
    catering_event_id TEXT,
    catering_event_name TEXT,
    catering_guests NUMERIC,
    required_output_quantity NUMERIC,
    needed_by_date DATE,
    started_by TEXT,
    started_date TIMESTAMPTZ,
    completed_by TEXT,
    completed_date TIMESTAMPTZ,
    total_cost NUMERIC,
    ingredients_consumed JSONB DEFAULT '[]'::jsonb,
    sub_recipe_consumption JSONB DEFAULT '[]'::jsonb,
    parent_production_order_id TEXT,
    parent_recipe_name TEXT,
    production_stage TEXT,
    waste_note TEXT,
    notes TEXT,
    assigned_staff JSONB DEFAULT '[]'::jsonb,
    prep_stage TEXT,
    prep_notes TEXT,
    handoff_to TEXT,
    handoff_by TEXT,
    handoff_date TIMESTAMPTZ,
    prep_updated_by TEXT
);

-- Entity: PromoCode -> Table: promo_code

CREATE TABLE IF NOT EXISTS promo_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    code TEXT,
    description TEXT,
    discount_type TEXT,
    discount_value NUMERIC,
    min_order_amount NUMERIC,
    max_discount_amount NUMERIC,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    usage_limit NUMERIC,
    times_used NUMERIC,
    is_active BOOLEAN DEFAULT false
);

-- Entity: Purchase -> Table: purchase

CREATE TABLE IF NOT EXISTS purchase (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    client_name TEXT,
    amount NUMERIC,
    cashback_earned NUMERIC,
    referrer_id TEXT,
    referrer_name TEXT,
    cashback_rate NUMERIC
);

-- Entity: PurchaseInvoice -> Table: purchase_invoice

CREATE TABLE IF NOT EXISTS purchase_invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    invoice_number TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    invoice_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC,
    notes TEXT,
    receipt_url TEXT,
    status TEXT,
    posted_by TEXT,
    posted_at TIMESTAMPTZ
);

-- Entity: PurchaseOrder -> Table: purchase_order

CREATE TABLE IF NOT EXISTS purchase_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    order_number TEXT,
    inventory_category_id TEXT,
    inventory_category_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    supplier_id TEXT,
    supplier TEXT,
    supplier_contact TEXT,
    order_date DATE,
    expected_delivery_date DATE,
    total_amount NUMERIC,
    status TEXT,
    notes TEXT,
    created_by_email TEXT,
    order_source TEXT,
    catering_event_id TEXT,
    catering_event_name TEXT,
    catering_event_date DATE,
    catering_event_ids JSONB DEFAULT '[]'::jsonb,
    catering_event_names JSONB DEFAULT '[]'::jsonb,
    catering_trigger TEXT,
    urgency TEXT,
    needed_by_date DATE,
    cancellation_reason TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    purchase_recorded_invoice_id TEXT,
    purchase_recorded_by TEXT,
    purchase_recorded_at TIMESTAMPTZ
);

-- Entity: PurchaseSubmission -> Table: purchase_submission

CREATE TABLE IF NOT EXISTS purchase_submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    client_name TEXT,
    receipt_number TEXT,
    amount NUMERIC,
    receipt_url TEXT,
    status TEXT,
    rejection_reason TEXT,
    notes TEXT
);

-- Entity: RechargeUserTier -> Table: recharge_user_tier

CREATE TABLE IF NOT EXISTS recharge_user_tier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    tier_name TEXT,
    min_total_recharged NUMERIC,
    min_recharge_amount NUMERIC,
    cashback_percentage NUMERIC,
    color TEXT,
    is_default BOOLEAN DEFAULT false,
    description TEXT
);

-- Entity: Recipe -> Table: recipe

CREATE TABLE IF NOT EXISTS recipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    output_item_id TEXT,
    output_item_name TEXT,
    output_quantity NUMERIC,
    output_unit TEXT,
    ingredients JSONB DEFAULT '[]'::jsonb,
    product_owner_id TEXT,
    product_owner_name TEXT,
    branch_id TEXT,
    branch_name TEXT,
    status TEXT,
    total_cost NUMERIC,
    notes TEXT
);

-- Entity: RecommendationEvent -> Table: recommendation_event

CREATE TABLE IF NOT EXISTS recommendation_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    recommended_item_id TEXT,
    recommended_item_name TEXT,
    recommendation_type TEXT,
    context TEXT,
    event_type TEXT,
    order_id TEXT
);

-- Entity: Redemption -> Table: redemption

CREATE TABLE IF NOT EXISTS redemption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    reward_id TEXT,
    reward_name TEXT,
    cashback_spent NUMERIC,
    status TEXT,
    redemption_code TEXT
);

-- Entity: ReferralBonus -> Table: referral_bonus

CREATE TABLE IF NOT EXISTS referral_bonus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    referrer_id TEXT,
    referrer_name TEXT,
    referred_client_id TEXT,
    referred_client_name TEXT,
    redemption_id TEXT,
    reward_name TEXT,
    cashback_amount NUMERIC,
    cashback_percentage NUMERIC,
    redemption_cost NUMERIC
);

-- Entity: ReferralMilestone -> Table: referral_milestone

CREATE TABLE IF NOT EXISTS referral_milestone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    required_referrals NUMERIC,
    bonus_amount NUMERIC,
    is_active BOOLEAN DEFAULT false,
    icon TEXT,
    color TEXT
);

-- Entity: RegistrationLevel -> Table: registration_level

CREATE TABLE IF NOT EXISTS registration_level (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    level_name TEXT,
    registration_fee NUMERIC,
    welcome_cashback_amount NUMERIC,
    permanent_discount_percentage NUMERIC,
    delivery_discount_percentage NUMERIC,
    self_cashback_percentage NUMERIC,
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    description TEXT,
    sort_order NUMERIC
);

-- Entity: RegistrationRequest -> Table: registration_request

CREATE TABLE IF NOT EXISTS registration_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    referral_code TEXT,
    referrer_id TEXT,
    referrer_name TEXT,
    payment_scan_url TEXT,
    registration_level_id TEXT,
    registration_level_name TEXT,
    registration_amount NUMERIC,
    status TEXT,
    admin_approved BOOLEAN DEFAULT false,
    rejection_reason TEXT
);

-- Entity: ReportRecipientSettings -> Table: report_recipient_settings

CREATE TABLE IF NOT EXISTS report_recipient_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    setting_key TEXT,
    daily_financial_summary JSONB DEFAULT '[]'::jsonb,
    delivery_compliance_report JSONB DEFAULT '[]'::jsonb,
    inventory_weight_compliance JSONB DEFAULT '[]'::jsonb,
    shared_report_link_days NUMERIC
);

-- Entity: Requisition -> Table: requisition

CREATE TABLE IF NOT EXISTS requisition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date DATE,
    requisition_number TEXT,
    created_from_quote_id TEXT,
    status TEXT,
    awaiting_side TEXT,
    current_revision NUMERIC,
    counter_round NUMERIC,
    planned_estimated_cost NUMERIC,
    extras_estimated_cost NUMERIC,
    uncosted_line_count NUMERIC,
    line_counts JSONB DEFAULT '{}'::jsonb,
    approval_status TEXT,
    approved_by TEXT,
    approved_date TEXT,
    approval_reason TEXT,
    approved_extras_cost TEXT,
    approved_uncosted_extra_ids JSONB DEFAULT '[]'::jsonb,
    approved_uncosted_quantities JSONB DEFAULT '[]'::jsonb,
    rejection_reason TEXT,
    rejected_by TEXT,
    rejected_date TEXT,
    approval_restore TEXT,
    limit_percent_applied TEXT,
    limit_amount_applied TEXT,
    planned_food_cost_applied TEXT,
    planned_food_cost_source TEXT,
    extras_total_applied TEXT,
    uncosted_extras_count TEXT,
    chef_user_id TEXT,
    chef_name TEXT,
    submitted_at TEXT,
    last_action_by TEXT,
    last_action_date TIMESTAMPTZ,
    cancelled_by TEXT,
    cancelled_date TEXT,
    cancel_reason TEXT,
    cancel_source TEXT,
    batch_count NUMERIC,
    batch_proposal TEXT
);

-- Entity: RequisitionLine -> Table: requisition_line

CREATE TABLE IF NOT EXISTS requisition_line (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    requisition_id TEXT,
    event_id TEXT,
    branch_id TEXT,
    line_type TEXT,
    inventory_item_id TEXT,
    inventory_item_name TEXT,
    unit TEXT,
    purpose TEXT,
    produced_item_name TEXT,
    production_order_id TEXT,
    requested_quantity NUMERIC,
    agreed_quantity TEXT,
    reservation_id TEXT,
    estimated_unit_cost TEXT,
    estimated_cost_status TEXT,
    uncosted_reason TEXT,
    needed_by_date DATE,
    inventory_decision TEXT,
    chef_response TEXT,
    is_agreed BOOLEAN DEFAULT false,
    decision_reason TEXT,
    chef_comment TEXT,
    is_active BOOLEAN DEFAULT false,
    sort_order NUMERIC
);

-- Entity: RequisitionRevision -> Table: requisition_revision

CREATE TABLE IF NOT EXISTS requisition_revision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    requisition_id TEXT,
    event_id TEXT,
    branch_id TEXT,
    revision_number NUMERIC,
    side TEXT,
    action TEXT,
    actor_user_id TEXT,
    actor_name TEXT,
    actor_role TEXT,
    action_date TIMESTAMPTZ,
    comment TEXT,
    approval_reason TEXT,
    limit_percent_applied TEXT,
    limit_amount_applied TEXT,
    planned_food_cost_applied TEXT,
    planned_food_cost_source TEXT,
    extras_total_applied TEXT,
    uncosted_extras_count TEXT,
    current_plan JSONB DEFAULT '[]'::jsonb,
    proposed_plan JSONB DEFAULT '[]'::jsonb,
    line_snapshots JSONB DEFAULT '[]'::jsonb
);

-- Entity: RestaurantInfo -> Table: restaurant_info

CREATE TABLE IF NOT EXISTS restaurant_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    landline TEXT,
    hotline TEXT,
    location TEXT,
    facebook TEXT,
    instagram TEXT,
    tiktok TEXT,
    address TEXT,
    partnership_marketing_text TEXT,
    guest_loyalty_program_text TEXT,
    logo_url TEXT,
    landing_logo_url TEXT,
    brand_name TEXT,
    theme_enabled BOOLEAN DEFAULT false,
    primary_color TEXT,
    secondary_color TEXT,
    accent_color TEXT,
    success_color TEXT,
    warning_color TEXT,
    danger_color TEXT
);

-- Entity: RestaurantLocation -> Table: restaurant_location

CREATE TABLE IF NOT EXISTS restaurant_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    radius_meters NUMERIC,
    location_name TEXT
);

-- Entity: Return -> Table: return

CREATE TABLE IF NOT EXISTS return (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    session_id TEXT,
    order_id TEXT,
    order_reference TEXT,
    return_date TIMESTAMPTZ,
    original_amount NUMERIC,
    refund_amount NUMERIC,
    payment_method TEXT,
    reason TEXT,
    status TEXT,
    notes TEXT
);

-- Entity: Review -> Table: review

CREATE TABLE IF NOT EXISTS review (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    menu_item_id TEXT,
    menu_item_name TEXT,
    client_id TEXT,
    client_name TEXT,
    order_id TEXT,
    rating NUMERIC,
    review_text TEXT,
    status TEXT,
    flagged_reason TEXT,
    admin_notes TEXT
);

-- Entity: Reward -> Table: reward

CREATE TABLE IF NOT EXISTS reward (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    cashback_cost NUMERIC,
    is_redeemable BOOLEAN DEFAULT false,
    category TEXT,
    image_url TEXT,
    is_variable_cost BOOLEAN DEFAULT false
);

-- Entity: RewardCategory -> Table: reward_category

CREATE TABLE IF NOT EXISTS reward_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    description TEXT,
    icon TEXT
);

-- Entity: ReworkEvent -> Table: rework_event

CREATE TABLE IF NOT EXISTS rework_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    date DATE,
    rework_type TEXT,
    rework_type_custom TEXT,
    input_sku_ids JSONB DEFAULT '[]'::jsonb,
    input_sku_names JSONB DEFAULT '[]'::jsonb,
    input_quantities JSONB DEFAULT '[]'::jsonb,
    input_total_cost NUMERIC,
    output_sku_ids JSONB DEFAULT '[]'::jsonb,
    output_sku_names JSONB DEFAULT '[]'::jsonb,
    output_quantities JSONB DEFAULT '[]'::jsonb,
    labor_cost NUMERIC,
    total_output_cost NUMERIC,
    lot_chain JSONB DEFAULT '[]'::jsonb,
    notes TEXT
);

-- Entity: Role -> Table: role

CREATE TABLE IF NOT EXISTS role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    role_key TEXT,
    role_label TEXT,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    disabled_modules JSONB DEFAULT '[]'::jsonb,
    catering_hidden_tabs JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    sort_order NUMERIC
);

-- Entity: SalaryPenalty -> Table: salary_penalty

CREATE TABLE IF NOT EXISTS salary_penalty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    employee_id TEXT,
    employee_name TEXT,
    penalty_type TEXT,
    amount NUMERIC,
    description TEXT,
    incident_date DATE,
    apply_to_month DATE,
    status TEXT,
    applied_salary_record_id TEXT
);

-- Entity: SalaryRecord -> Table: salary_record

CREATE TABLE IF NOT EXISTS salary_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    employee_id TEXT,
    employee_name TEXT,
    month DATE,
    base_salary NUMERIC,
    hourly_earnings NUMERIC,
    total_hours NUMERIC,
    regular_hours NUMERIC,
    overtime_hours NUMERIC,
    overtime_earnings NUMERIC,
    attendance_deductions NUMERIC,
    approved_days NUMERIC,
    bonus NUMERIC,
    deductions NUMERIC,
    penalty_deductions NUMERIC,
    borrowing_deductions NUMERIC,
    gross_salary NUMERIC,
    net_salary NUMERIC,
    tax_withheld_amount TEXT,
    tax_withholding_note TEXT,
    payment_status TEXT,
    payment_date DATE,
    notes TEXT
);

-- Entity: SalaryRevision -> Table: salary_revision

CREATE TABLE IF NOT EXISTS salary_revision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    employee_record_id TEXT,
    employee_name TEXT,
    branch_id TEXT,
    effective_date DATE,
    reason TEXT,
    prior_hourly_rate TEXT,
    prior_fixed_salary TEXT,
    new_hourly_rate TEXT,
    new_fixed_salary TEXT,
    status TEXT,
    proposed_by TEXT,
    proposed_by_id TEXT,
    proposed_at TIMESTAMPTZ,
    decided_by TEXT,
    decided_by_id TEXT,
    decided_at TIMESTAMPTZ,
    decision_note TEXT
);

-- Entity: ScheduleSettings -> Table: schedule_settings

CREATE TABLE IF NOT EXISTS schedule_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    setting_key TEXT,
    shortfall_escalation_hour TEXT,
    orphan_scan_weekday TEXT,
    orphan_scan_hour TEXT,
    permission_sync_hour TEXT,
    daily_summary_hour TEXT,
    custody_delay_hours TEXT,
    default_lead_time_days TEXT,
    default_low_stock_threshold TEXT,
    catering_default_expected_hours TEXT,
    catering_min_actual_hours TEXT,
    catering_default_start_hour TEXT,
    record_job_min_gap_minutes TEXT,
    action_heal_throttle_minutes TEXT
);

-- Entity: SharedReportLink -> Table: shared_report_link

CREATE TABLE IF NOT EXISTS shared_report_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    token TEXT,
    file_uri TEXT,
    expires_at TIMESTAMPTZ,
    report_type TEXT,
    reference_id TEXT,
    shared_by TEXT,
    open_count NUMERIC
);

-- Entity: Shift -> Table: shift

CREATE TABLE IF NOT EXISTS shift (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    employee_id TEXT,
    employee_name TEXT,
    shift_date DATE,
    start_time TEXT,
    end_time TEXT,
    expected_hours NUMERIC,
    is_repeating BOOLEAN DEFAULT false,
    repeat_days JSONB DEFAULT '[]'::jsonb,
    repeat_start_date DATE,
    repeat_end_date DATE,
    weekends_off JSONB DEFAULT '[]'::jsonb,
    shift_source TEXT,
    catering_event_id TEXT,
    catering_event_name TEXT,
    catering_assignment_id TEXT,
    catering_role TEXT,
    status TEXT,
    notes TEXT
);

-- Entity: SlaughterEvent -> Table: slaughter_event

CREATE TABLE IF NOT EXISTS slaughter_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    animal_id TEXT,
    animal_tag TEXT,
    processing_batch_id TEXT,
    batch_number TEXT,
    date DATE,
    hot_carcass_weight NUMERIC,
    cold_carcass_weight NUMERIC,
    dressing_percentage NUMERIC,
    disposal_cost NUMERIC,
    processing_cost_share NUMERIC,
    total_cost NUMERIC,
    net_cost_to_allocate NUMERIC,
    condemnation_type TEXT,
    condemnation_note TEXT,
    reconciliation_status TEXT,
    reconciliation_note TEXT,
    cost_allocated BOOLEAN DEFAULT false,
    notes TEXT
);

-- Entity: SMSNotificationPreferences -> Table: smsnotification_preferences

CREATE TABLE IF NOT EXISTS smsnotification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    user_id TEXT,
    user_email TEXT,
    phone_number TEXT,
    order_confirmations BOOLEAN DEFAULT false,
    delivery_assignments BOOLEAN DEFAULT false,
    low_stock_alerts BOOLEAN DEFAULT false,
    promotional_messages BOOLEAN DEFAULT false
);

-- Entity: SocialMediaConnection -> Table: social_media_connection

CREATE TABLE IF NOT EXISTS social_media_connection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    platform TEXT,
    is_enabled BOOLEAN DEFAULT false,
    account_name TEXT,
    account_id TEXT,
    app_id TEXT,
    default_campaign TEXT,
    connection_status TEXT,
    last_verified_date TIMESTAMPTZ,
    notes TEXT
);

-- Entity: StorageLocation -> Table: storage_location

CREATE TABLE IF NOT EXISTS storage_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    name TEXT,
    description TEXT,
    sort_order NUMERIC,
    is_active BOOLEAN DEFAULT false
);

-- Entity: Supplier -> Table: supplier

CREATE TABLE IF NOT EXISTS supplier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    name TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    payment_terms TEXT,
    supplied_category_ids JSONB DEFAULT '[]'::jsonb,
    supplied_category_names JSONB DEFAULT '[]'::jsonb,
    rating NUMERIC,
    total_orders NUMERIC,
    total_spent NUMERIC,
    total_outstanding NUMERIC,
    delivery_performance NUMERIC,
    quality_rating NUMERIC,
    notes TEXT,
    is_active BOOLEAN DEFAULT false
);

-- Entity: SupplierReview -> Table: supplier_review

CREATE TABLE IF NOT EXISTS supplier_review (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    purchase_order_id TEXT,
    delivery_rating NUMERIC,
    quality_rating NUMERIC,
    overall_rating NUMERIC,
    comments TEXT,
    reviewed_by TEXT
);

-- Entity: SystemSettings -> Table: system_settings

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    enable_low_stock_alerts BOOLEAN DEFAULT false,
    send_low_stock_emails BOOLEAN DEFAULT false,
    send_low_stock_sms BOOLEAN DEFAULT false,
    registration_fee NUMERIC,
    welcome_cashback_percentage NUMERIC,
    payout_percent NUMERIC,
    min_payout_amount NUMERIC,
    rewards_discounts_percent NUMERIC,
    default_tax_percentage NUMERIC,
    default_service_percentage NUMERIC,
    dine_in_tax_percentage NUMERIC,
    dine_in_service_percentage NUMERIC,
    delivery_tax_percentage NUMERIC,
    delivery_service_percentage NUMERIC,
    takeaway_tax_percentage NUMERIC,
    takeaway_service_percentage NUMERIC,
    overall_restaurant_margin_percentage TEXT,
    catering_target_margin_percentage TEXT,
    bank_transfer_enabled BOOLEAN DEFAULT false,
    paypal_enabled BOOLEAN DEFAULT false,
    cash_enabled BOOLEAN DEFAULT false,
    instapay_enabled BOOLEAN DEFAULT false,
    wallet_enabled BOOLEAN DEFAULT false,
    stripe_enabled BOOLEAN DEFAULT false,
    stripe_public_key TEXT,
    default_daily_withdrawal_limit NUMERIC,
    default_weekly_withdrawal_limit NUMERIC,
    default_monthly_withdrawal_limit NUMERIC,
    instapay_number TEXT,
    wallet_number TEXT,
    default_root_client_id TEXT,
    default_root_client_name TEXT,
    default_pos_client_id TEXT,
    default_pos_client_name TEXT,
    stock_review_freeze_enabled BOOLEAN DEFAULT false,
    stock_review_freeze_type TEXT,
    stock_review_frozen_categories JSONB DEFAULT '[]'::jsonb,
    stock_review_freeze_start TIMESTAMPTZ,
    stock_review_freeze_end TIMESTAMPTZ,
    stock_review_freeze_reason TEXT,
    kds_sound_enabled BOOLEAN DEFAULT false,
    kds_alert_volume NUMERIC,
    kds_new_order_sound_url TEXT,
    kds_overdue_sound_url TEXT,
    setting_key TEXT,
    numeral_style TEXT,
    timezone_offset_minutes NUMERIC,
    disabled_modules JSONB DEFAULT '[]'::jsonb,
    auto_approve_with_permission BOOLEAN DEFAULT false
);

-- Entity: Table -> Table: "table"

CREATE TABLE IF NOT EXISTS "table" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    table_number TEXT,
    status TEXT,
    current_order_id TEXT,
    merged_with JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT false,
    capacity NUMERIC,
    minimum_charge_enabled BOOLEAN DEFAULT false,
    minimum_charge_per_guest NUMERIC,
    minimum_charge_guests NUMERIC
);

-- Entity: TableFeedback -> Table: table_feedback

CREATE TABLE IF NOT EXISTS table_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    table_number TEXT,
    captain_email TEXT,
    captain_name TEXT,
    client_id TEXT,
    client_name TEXT,
    client_phone TEXT,
    food_rating NUMERIC,
    service_rating NUMERIC,
    comment TEXT,
    would_recommend BOOLEAN DEFAULT false,
    follow_up_needed BOOLEAN DEFAULT false
);

-- Entity: TalabatReceipt -> Table: talabat_receipt

CREATE TABLE IF NOT EXISTS talabat_receipt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    client_id TEXT,
    client_name TEXT,
    mobile_number TEXT,
    customer_address TEXT,
    address_qr_code TEXT,
    qr_code_image_url TEXT,
    raw_extraction TEXT,
    order_id TEXT,
    status TEXT
);

-- Entity: UiTranslation -> Table: ui_translation

CREATE TABLE IF NOT EXISTS ui_translation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    source TEXT,
    target TEXT
);

-- Entity: User -> Table: "user"

CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    portal_client_id TEXT,
    portal_client_name TEXT,
    is_catering_staff BOOLEAN DEFAULT false,
    catering_branch_ids JSONB DEFAULT '[]'::jsonb,
    is_staff BOOLEAN DEFAULT false,
    perm_flags JSONB DEFAULT '{}'::jsonb,
    perm_role TEXT,
    perm_is_central_admin BOOLEAN DEFAULT false,
    perm_is_safety_valve BOOLEAN DEFAULT false,
    perm_branch_id TEXT,
    perm_synced_at TEXT,
    perm_catering_view BOOLEAN DEFAULT false,
    perm_catering_edit BOOLEAN DEFAULT false,
    perm_catering_finance BOOLEAN DEFAULT false,
    perm_catering_approve BOOLEAN DEFAULT false,
    perm_has_branch BOOLEAN DEFAULT false,
    perm_has_role BOOLEAN DEFAULT false,
    perm_hr_view BOOLEAN DEFAULT false,
    perm_hr_edit BOOLEAN DEFAULT false,
    perm_hr_approve BOOLEAN DEFAULT false,
    perm_finance_view BOOLEAN DEFAULT false,
    perm_finance_edit BOOLEAN DEFAULT false,
    perm_cashier_view BOOLEAN DEFAULT false,
    perm_cashier_edit BOOLEAN DEFAULT false,
    perm_cashier_audit BOOLEAN DEFAULT false,
    perm_settings_edit BOOLEAN DEFAULT false,
    perm_users_manage BOOLEAN DEFAULT false,
    perm_admin_operations BOOLEAN DEFAULT false,
    perm_admin_actions BOOLEAN DEFAULT false,
    perm_admin_systems BOOLEAN DEFAULT false,
    perm_purchases_approve BOOLEAN DEFAULT false,
    perm_butchery_view BOOLEAN DEFAULT false,
    perm_butchery_edit BOOLEAN DEFAULT false,
    perm_requisition_view BOOLEAN DEFAULT false,
    perm_requisition_flow_manage BOOLEAN DEFAULT false,
    perm_requisition_submit BOOLEAN DEFAULT false,
    perm_requisition_respond BOOLEAN DEFAULT false,
    perm_requisition_approve BOOLEAN DEFAULT false,
    perm_catering_settings_edit BOOLEAN DEFAULT false,
    perm_expense_approve BOOLEAN DEFAULT false,
    perm_cashier_purchase_approve BOOLEAN DEFAULT false,
    perm_payouts_approve BOOLEAN DEFAULT false,
    perm_purchase_submission_approve BOOLEAN DEFAULT false,
    perm_recharge_approve BOOLEAN DEFAULT false,
    perm_registrations_approve BOOLEAN DEFAULT false,
    perm_registrations_view BOOLEAN DEFAULT false,
    perm_level_upgrade_approve BOOLEAN DEFAULT false,
    perm_redemptions_approve BOOLEAN DEFAULT false,
    perm_redemptions_view BOOLEAN DEFAULT false,
    perm_return_approve BOOLEAN DEFAULT false,
    perm_cashback_dist_approve BOOLEAN DEFAULT false,
    perm_purchase_approve BOOLEAN DEFAULT false,
    perm_purchase_view BOOLEAN DEFAULT false,
    perm_purchase_edit BOOLEAN DEFAULT false,
    perm_inventory_view BOOLEAN DEFAULT false,
    perm_inventory_edit BOOLEAN DEFAULT false,
    perm_waste_approve BOOLEAN DEFAULT false,
    perm_expiry_manage BOOLEAN DEFAULT false,
    perm_delivery_bonus_approve BOOLEAN DEFAULT false,
    perm_cashier_session_approve BOOLEAN DEFAULT false,
    perm_purchases_view BOOLEAN DEFAULT false,
    perm_clients_view BOOLEAN DEFAULT false,
    perm_kds_view BOOLEAN DEFAULT false,
    perm_employee_id TEXT,
    perm_delivery_person_id TEXT,
    perm_client_id TEXT
);

-- Entity: UserNotificationPreferences -> Table: user_notification_preferences

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    client_id TEXT,
    email TEXT,
    phone TEXT,
    push_enabled BOOLEAN DEFAULT false,
    push_token TEXT,
    email_enabled BOOLEAN DEFAULT false,
    sms_enabled BOOLEAN DEFAULT false,
    order_updates BOOLEAN DEFAULT false,
    order_placed BOOLEAN DEFAULT false,
    order_preparing BOOLEAN DEFAULT false,
    order_ready BOOLEAN DEFAULT false,
    order_completed BOOLEAN DEFAULT false,
    promotions BOOLEAN DEFAULT false,
    new_menu_items BOOLEAN DEFAULT false,
    special_offers BOOLEAN DEFAULT false,
    cashback_updates BOOLEAN DEFAULT false,
    referral_updates BOOLEAN DEFAULT false,
    payout_approvals BOOLEAN DEFAULT false,
    tier_updates BOOLEAN DEFAULT false
);

-- Entity: UserPermissions -> Table: user_permissions

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    user_email TEXT,
    user_name TEXT,
    branch_id TEXT,
    branch_name TEXT,
    role TEXT,
    permission_overrides JSONB DEFAULT '{}'::jsonb,
    module_overrides JSONB DEFAULT '{}'::jsonb,
    is_ex_employee BOOLEAN DEFAULT false,
    previous_role TEXT
);

-- Entity: VendorSupportInfo -> Table: vendor_support_info

CREATE TABLE IF NOT EXISTS vendor_support_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    setting_key TEXT,
    support_email TEXT,
    website TEXT,
    mobile TEXT,
    updated_by TEXT
);

-- Entity: VeraKit360ManualSection -> Table: vera_kit360_manual_section

CREATE TABLE IF NOT EXISTS vera_kit360_manual_section (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    module_name TEXT,
    category TEXT,
    language TEXT,
    description TEXT,
    benefits_and_features TEXT,
    max_benefit_strategy TEXT,
    cautions TEXT,
    required_accurate_data TEXT,
    usage_guide TEXT,
    related_entities JSONB DEFAULT '[]'::jsonb,
    screenshot_urls JSONB DEFAULT '[]'::jsonb,
    order NUMERIC,
    last_updated TIMESTAMPTZ
);

-- Entity: VisaCredit -> Table: visa_credit

CREATE TABLE IF NOT EXISTS visa_credit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    session_id TEXT,
    credit_date TIMESTAMPTZ,
    delivery_company_id TEXT,
    delivery_company TEXT,
    payment_method TEXT,
    amount NUMERIC,
    order_reference TEXT,
    customer_name TEXT,
    notes TEXT,
    status TEXT
);

-- Entity: VoiceOrder -> Table: voice_order

CREATE TABLE IF NOT EXISTS voice_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    audio_url TEXT,
    is_call_center_order BOOLEAN DEFAULT false,
    call_center_agent TEXT,
    is_captain_order BOOLEAN DEFAULT false,
    captain_email TEXT,
    captain_name TEXT,
    table_number TEXT,
    guest_count NUMERIC,
    order_items JSONB DEFAULT '[]'::jsonb,
    estimated_total NUMERIC,
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    delivery_zone_id TEXT,
    delivery_zone_name TEXT,
    delivery_fee NUMERIC,
    order_type TEXT,
    status TEXT,
    transcript TEXT,
    corrected_transcript TEXT,
    summary TEXT,
    confidence TEXT,
    confidence_reason TEXT,
    rejection_reason TEXT,
    processed_by TEXT,
    processed_date TIMESTAMPTZ,
    branch_id TEXT,
    branch_name TEXT,
    created_order_id TEXT,
    notes TEXT
);

-- Entity: WasteByProduct -> Table: waste_by_product

CREATE TABLE IF NOT EXISTS waste_by_product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    slaughter_event_id TEXT,
    primal_cut_id TEXT,
    type TEXT,
    category TEXT,
    name TEXT,
    weight NUMERIC,
    weight_unit TEXT,
    disposal_cost NUMERIC,
    hauler_method TEXT,
    recovery_value NUMERIC,
    recovery_value_source TEXT,
    is_estimated BOOLEAN DEFAULT false,
    raw_material_id TEXT,
    notes TEXT
);

-- Entity: WasteDeclaration -> Table: waste_declaration

CREATE TABLE IF NOT EXISTS waste_declaration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    branch_id TEXT,
    branch_name TEXT,
    event_id TEXT,
    catering_cost_treatment TEXT,
    waste_date DATE,
    inventory_item_id TEXT,
    inventory_item_name TEXT,
    category_id TEXT,
    category_name TEXT,
    quantity_wasted NUMERIC,
    unit TEXT,
    reason TEXT,
    notes TEXT,
    waste_image_url TEXT,
    cost_impact NUMERIC,
    declared_by TEXT,
    status TEXT,
    approved_by TEXT,
    rejection_reason TEXT
);


-- Performance Indexes

CREATE INDEX IF NOT EXISTS idx_active_offer_branch_id ON active_offer(branch_id);

CREATE INDEX IF NOT EXISTS idx_active_offer_bundle_item_id ON active_offer(bundle_item_id);

CREATE INDEX IF NOT EXISTS idx_address_client_id ON address(client_id);

CREATE INDEX IF NOT EXISTS idx_animal_supplier_id ON animal(supplier_id);

CREATE INDEX IF NOT EXISTS idx_animal_status ON animal(status);

CREATE INDEX IF NOT EXISTS idx_animal_processing_batch_id ON animal(processing_batch_id);

CREATE INDEX IF NOT EXISTS idx_attendance_branch_id ON attendance(branch_id);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_shift_id ON attendance(shift_id);

CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_status ON audit_log(status);

CREATE INDEX IF NOT EXISTS idx_balance_recharge_branch_id ON balance_recharge(branch_id);

CREATE INDEX IF NOT EXISTS idx_balance_recharge_client_id ON balance_recharge(client_id);

CREATE INDEX IF NOT EXISTS idx_balance_recharge_status ON balance_recharge(status);

CREATE INDEX IF NOT EXISTS idx_branch_branch_code ON branch(branch_code);

CREATE INDEX IF NOT EXISTS idx_butchery_expense_animal_id ON butchery_expense(animal_id);

CREATE INDEX IF NOT EXISTS idx_butchery_raw_material_primal_cut_id ON butchery_raw_material(primal_cut_id);

CREATE INDEX IF NOT EXISTS idx_butchery_raw_material_waste_byproduct_id ON butchery_raw_material(waste_byproduct_id);

CREATE INDEX IF NOT EXISTS idx_butchery_raw_material_rework_event_id ON butchery_raw_material(rework_event_id);

CREATE INDEX IF NOT EXISTS idx_butchery_raw_material_slaughter_event_id ON butchery_raw_material(slaughter_event_id);

CREATE INDEX IF NOT EXISTS idx_butchery_raw_material_animal_id ON butchery_raw_material(animal_id);

CREATE INDEX IF NOT EXISTS idx_butchery_raw_material_supplier_id ON butchery_raw_material(supplier_id);

CREATE INDEX IF NOT EXISTS idx_butchery_raw_material_inventory_item_id ON butchery_raw_material(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_butchery_raw_material_status ON butchery_raw_material(status);

CREATE INDEX IF NOT EXISTS idx_butchery_supplier_email ON butchery_supplier(email);

CREATE INDEX IF NOT EXISTS idx_campaign_recipient_campaign_id ON campaign_recipient(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_recipient_client_id ON campaign_recipient(client_id);

CREATE INDEX IF NOT EXISTS idx_campaign_recipient_status ON campaign_recipient(status);

CREATE INDEX IF NOT EXISTS idx_cashback_distribution_pending_order_id ON cashback_distribution_pending(order_id);

CREATE INDEX IF NOT EXISTS idx_cashback_distribution_pending_customer_id ON cashback_distribution_pending(customer_id);

CREATE INDEX IF NOT EXISTS idx_cashback_distribution_pending_status ON cashback_distribution_pending(status);

CREATE INDEX IF NOT EXISTS idx_cashback_rule_history_order_id ON cashback_rule_history(order_id);

CREATE INDEX IF NOT EXISTS idx_cashback_rule_history_customer_id ON cashback_rule_history(customer_id);

CREATE INDEX IF NOT EXISTS idx_cashback_rule_history_rule_id ON cashback_rule_history(rule_id);

CREATE INDEX IF NOT EXISTS idx_cashback_tier_registration_level_id ON cashback_tier(registration_level_id);

CREATE INDEX IF NOT EXISTS idx_cashback_transaction_client_id ON cashback_transaction(client_id);

CREATE INDEX IF NOT EXISTS idx_cashback_transaction_source_client_id ON cashback_transaction(source_client_id);

CREATE INDEX IF NOT EXISTS idx_cashier_purchase_branch_id ON cashier_purchase(branch_id);

CREATE INDEX IF NOT EXISTS idx_cashier_purchase_session_id ON cashier_purchase(session_id);

CREATE INDEX IF NOT EXISTS idx_cashier_purchase_supplier_id ON cashier_purchase(supplier_id);

CREATE INDEX IF NOT EXISTS idx_cashier_purchase_status ON cashier_purchase(status);

CREATE INDEX IF NOT EXISTS idx_cashier_session_branch_id ON cashier_session(branch_id);

CREATE INDEX IF NOT EXISTS idx_cashier_session_cashier_id ON cashier_session(cashier_id);

CREATE INDEX IF NOT EXISTS idx_cashier_session_status ON cashier_session(status);

CREATE INDEX IF NOT EXISTS idx_catering_actual_cost_run_event_id ON catering_actual_cost_run(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_actual_cost_run_branch_id ON catering_actual_cost_run(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_actual_cost_run_status ON catering_actual_cost_run(status);

CREATE INDEX IF NOT EXISTS idx_catering_assignment_branch_id ON catering_assignment(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_assignment_event_id ON catering_assignment(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_assignment_role_id ON catering_assignment(role_id);

CREATE INDEX IF NOT EXISTS idx_catering_assignment_employee_id ON catering_assignment(employee_id);

CREATE INDEX IF NOT EXISTS idx_catering_assignment_shift_id ON catering_assignment(shift_id);

CREATE INDEX IF NOT EXISTS idx_catering_assignment_status ON catering_assignment(status);

CREATE INDEX IF NOT EXISTS idx_catering_cancellation_policy_branch_id ON catering_cancellation_policy(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_cost_exception_event_id ON catering_cost_exception(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_cost_exception_branch_id ON catering_cost_exception(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_cost_exception_status ON catering_cost_exception(status);

CREATE INDEX IF NOT EXISTS idx_catering_custody_checkpoint_trip_id ON catering_custody_checkpoint(trip_id);

CREATE INDEX IF NOT EXISTS idx_catering_custody_checkpoint_event_id ON catering_custody_checkpoint(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_custody_checkpoint_branch_id ON catering_custody_checkpoint(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_custody_checkpoint_status ON catering_custody_checkpoint(status);

CREATE INDEX IF NOT EXISTS idx_catering_custody_checkpoint_reported_by_employee_id ON catering_custody_checkpoint(reported_by_employee_id);

CREATE INDEX IF NOT EXISTS idx_catering_custody_checkpoint_responsible_employee_id ON catering_custody_checkpoint(responsible_employee_id);

CREATE INDEX IF NOT EXISTS idx_catering_custody_checkpoint_feedback_id ON catering_custody_checkpoint(feedback_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_home_branch_id ON catering_equipment(home_branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_maintenance_equipment_id ON catering_equipment_maintenance(equipment_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_maintenance_unit_id ON catering_equipment_maintenance(unit_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_maintenance_reservation_id ON catering_equipment_maintenance(reservation_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_maintenance_status ON catering_equipment_maintenance(status);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_maintenance_event_id ON catering_equipment_maintenance(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_reservation_branch_id ON catering_equipment_reservation(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_reservation_event_id ON catering_equipment_reservation(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_reservation_equipment_id ON catering_equipment_reservation(equipment_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_reservation_unit_id ON catering_equipment_reservation(unit_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_reservation_status ON catering_equipment_reservation(status);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_unit_equipment_id ON catering_equipment_unit(equipment_id);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_unit_status ON catering_equipment_unit(status);

CREATE INDEX IF NOT EXISTS idx_catering_equipment_unit_current_event_id ON catering_equipment_unit(current_event_id);

CREATE INDEX IF NOT EXISTS idx_catering_event_branch_id ON catering_event(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_event_client_id ON catering_event(client_id);

CREATE INDEX IF NOT EXISTS idx_catering_event_status ON catering_event(status);

CREATE INDEX IF NOT EXISTS idx_catering_event_active_quote_id ON catering_event(active_quote_id);

CREATE INDEX IF NOT EXISTS idx_catering_event_production_planned_from_quote_id ON catering_event(production_planned_from_quote_id);

CREATE INDEX IF NOT EXISTS idx_catering_event_cancellation_policy_id ON catering_event(cancellation_policy_id);

CREATE INDEX IF NOT EXISTS idx_catering_event_actual_cost_run_id ON catering_event(actual_cost_run_id);

CREATE INDEX IF NOT EXISTS idx_catering_event_type_discount_branch_id ON catering_event_type_discount(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_invitation_branch_id ON catering_invitation(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_invitation_event_id ON catering_invitation(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_invitation_email ON catering_invitation(email);

CREATE INDEX IF NOT EXISTS idx_catering_media_vendor_email ON catering_media_vendor(email);

CREATE INDEX IF NOT EXISTS idx_catering_media_vendor_branch_id ON catering_media_vendor(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_package_branch_id ON catering_package(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_payment_branch_id ON catering_payment(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_payment_event_id ON catering_payment(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_payment_quote_id ON catering_payment(quote_id);

CREATE INDEX IF NOT EXISTS idx_catering_payment_client_id ON catering_payment(client_id);

CREATE INDEX IF NOT EXISTS idx_catering_payment_status ON catering_payment(status);

CREATE INDEX IF NOT EXISTS idx_catering_payment_recorded_by_id ON catering_payment(recorded_by_id);

CREATE INDEX IF NOT EXISTS idx_catering_payment_review_lock_event_id ON catering_payment_review_lock(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_portal_access_client_id ON catering_portal_access(client_id);

CREATE INDEX IF NOT EXISTS idx_catering_portal_access_email ON catering_portal_access(email);

CREATE INDEX IF NOT EXISTS idx_catering_portal_access_status ON catering_portal_access(status);

CREATE INDEX IF NOT EXISTS idx_catering_portal_access_linked_user_id ON catering_portal_access(linked_user_id);

CREATE INDEX IF NOT EXISTS idx_catering_portal_quote_override_event_id ON catering_portal_quote_override(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_quote_branch_id ON catering_quote(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_quote_event_id ON catering_quote(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_quote_client_id ON catering_quote(client_id);

CREATE INDEX IF NOT EXISTS idx_catering_quote_status ON catering_quote(status);

CREATE INDEX IF NOT EXISTS idx_catering_quote_package_id ON catering_quote(package_id);

CREATE INDEX IF NOT EXISTS idx_catering_reconciliation_branch_id ON catering_reconciliation(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_reconciliation_event_id ON catering_reconciliation(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_reconciliation_client_id ON catering_reconciliation(client_id);

CREATE INDEX IF NOT EXISTS idx_catering_reconciliation_quote_id ON catering_reconciliation(quote_id);

CREATE INDEX IF NOT EXISTS idx_catering_reconciliation_status ON catering_reconciliation(status);

CREATE INDEX IF NOT EXISTS idx_catering_reservation_branch_id ON catering_reservation(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_reservation_event_id ON catering_reservation(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_reservation_quote_id ON catering_reservation(quote_id);

CREATE INDEX IF NOT EXISTS idx_catering_reservation_inventory_item_id ON catering_reservation(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_catering_reservation_production_order_id ON catering_reservation(production_order_id);

CREATE INDEX IF NOT EXISTS idx_catering_reservation_purchase_order_id ON catering_reservation(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_catering_reservation_status ON catering_reservation(status);

CREATE INDEX IF NOT EXISTS idx_catering_returned_item_branch_id ON catering_returned_item(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_returned_item_event_id ON catering_returned_item(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_returned_item_inventory_item_id ON catering_returned_item(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_catering_settings_head_chef_employee_id ON catering_settings(head_chef_employee_id);

CREATE INDEX IF NOT EXISTS idx_catering_staff_feedback_branch_id ON catering_staff_feedback(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_staff_feedback_event_id ON catering_staff_feedback(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_staff_feedback_assignment_id ON catering_staff_feedback(assignment_id);

CREATE INDEX IF NOT EXISTS idx_catering_staff_feedback_employee_id ON catering_staff_feedback(employee_id);

CREATE INDEX IF NOT EXISTS idx_catering_staff_feedback_custody_checkpoint_id ON catering_staff_feedback(custody_checkpoint_id);

CREATE INDEX IF NOT EXISTS idx_catering_transfer_proof_branch_id ON catering_transfer_proof(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_transfer_proof_event_id ON catering_transfer_proof(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_transfer_proof_client_id ON catering_transfer_proof(client_id);

CREATE INDEX IF NOT EXISTS idx_catering_transfer_proof_status ON catering_transfer_proof(status);

CREATE INDEX IF NOT EXISTS idx_catering_trip_branch_id ON catering_trip(branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_trip_event_id ON catering_trip(event_id);

CREATE INDEX IF NOT EXISTS idx_catering_trip_vehicle_id ON catering_trip(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_catering_trip_driver_assignment_id ON catering_trip(driver_assignment_id);

CREATE INDEX IF NOT EXISTS idx_catering_trip_driver_employee_id ON catering_trip(driver_employee_id);

CREATE INDEX IF NOT EXISTS idx_catering_vehicle_home_branch_id ON catering_vehicle(home_branch_id);

CREATE INDEX IF NOT EXISTS idx_catering_vehicle_status ON catering_vehicle(status);

CREATE INDEX IF NOT EXISTS idx_client_email ON client(email);

CREATE INDEX IF NOT EXISTS idx_client_status ON client(status);

CREATE INDEX IF NOT EXISTS idx_client_current_tier_id ON client(current_tier_id);

CREATE INDEX IF NOT EXISTS idx_client_loyalty_tier_id ON client(loyalty_tier_id);

CREATE INDEX IF NOT EXISTS idx_client_registration_level_id ON client(registration_level_id);

CREATE INDEX IF NOT EXISTS idx_client_recharge_tier_id ON client(recharge_tier_id);

CREATE INDEX IF NOT EXISTS idx_client_owner_employee_id ON client(owner_employee_id);

CREATE INDEX IF NOT EXISTS idx_client_merged_into_id ON client(merged_into_id);

CREATE INDEX IF NOT EXISTS idx_client_interaction_client_id ON client_interaction(client_id);

CREATE INDEX IF NOT EXISTS idx_client_segment_status ON client_segment(status);

CREATE INDEX IF NOT EXISTS idx_client_segment_owner_employee_id ON client_segment(owner_employee_id);

CREATE INDEX IF NOT EXISTS idx_daily_financial_summary_branch_id ON daily_financial_summary(branch_id);

CREATE INDEX IF NOT EXISTS idx_daily_financial_summary_cashier_session_id ON daily_financial_summary(cashier_session_id);

CREATE INDEX IF NOT EXISTS idx_delivery_bonus_record_delivery_person_id ON delivery_bonus_record(delivery_person_id);

CREATE INDEX IF NOT EXISTS idx_delivery_bonus_record_bonus_tier_id ON delivery_bonus_record(bonus_tier_id);

CREATE INDEX IF NOT EXISTS idx_delivery_bonus_record_trigger_order_id ON delivery_bonus_record(trigger_order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_bonus_record_status ON delivery_bonus_record(status);

CREATE INDEX IF NOT EXISTS idx_delivery_company_branch_id ON delivery_company(branch_id);

CREATE INDEX IF NOT EXISTS idx_delivery_message_order_id ON delivery_message(order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_person_branch_id ON delivery_person(branch_id);

CREATE INDEX IF NOT EXISTS idx_delivery_person_email ON delivery_person(email);

CREATE INDEX IF NOT EXISTS idx_delivery_person_status ON delivery_person(status);

CREATE INDEX IF NOT EXISTS idx_delivery_receipt_compliance_order_id ON delivery_receipt_compliance(order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_receipt_compliance_session_id ON delivery_receipt_compliance(session_id);

CREATE INDEX IF NOT EXISTS idx_delivery_receipt_compliance_branch_id ON delivery_receipt_compliance(branch_id);

CREATE INDEX IF NOT EXISTS idx_delivery_receipt_compliance_delivery_company_id ON delivery_receipt_compliance(delivery_company_id);

CREATE INDEX IF NOT EXISTS idx_delivery_receipt_compliance_customer_id ON delivery_receipt_compliance(customer_id);

CREATE INDEX IF NOT EXISTS idx_delivery_zone_branch_id ON delivery_zone(branch_id);

CREATE INDEX IF NOT EXISTS idx_deposit_branch_id ON deposit(branch_id);

CREATE INDEX IF NOT EXISTS idx_deposit_session_id ON deposit(session_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_action_branch_id ON disciplinary_action(branch_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_action_employee_id ON disciplinary_action(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_branch_id ON employee(branch_id);

CREATE INDEX IF NOT EXISTS idx_employee_email ON employee(email);

CREATE INDEX IF NOT EXISTS idx_employee_employee_id ON employee(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_status ON employee(status);

CREATE INDEX IF NOT EXISTS idx_employee_borrowing_branch_id ON employee_borrowing(branch_id);

CREATE INDEX IF NOT EXISTS idx_employee_borrowing_employee_id ON employee_borrowing(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_borrowing_status ON employee_borrowing(status);

CREATE INDEX IF NOT EXISTS idx_employee_private_employee_record_id ON employee_private(employee_record_id);

CREATE INDEX IF NOT EXISTS idx_ex_employee_original_employee_id ON ex_employee(original_employee_id);

CREATE INDEX IF NOT EXISTS idx_ex_employee_employee_id ON ex_employee(employee_id);

CREATE INDEX IF NOT EXISTS idx_ex_employee_email ON ex_employee(email);

CREATE INDEX IF NOT EXISTS idx_ex_employee_branch_id ON ex_employee(branch_id);

CREATE INDEX IF NOT EXISTS idx_expense_branch_id ON expense(branch_id);

CREATE INDEX IF NOT EXISTS idx_expense_session_id ON expense(session_id);

CREATE INDEX IF NOT EXISTS idx_expense_status ON expense(status);

CREATE INDEX IF NOT EXISTS idx_expiry_report_branch_id ON expiry_report(branch_id);

CREATE INDEX IF NOT EXISTS idx_expiry_report_inventory_item_id ON expiry_report(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_expiry_report_category_id ON expiry_report(category_id);

CREATE INDEX IF NOT EXISTS idx_expiry_report_status ON expiry_report(status);

CREATE INDEX IF NOT EXISTS idx_finance_account_company_id ON finance_account(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_audit_event_company_id ON finance_audit_event(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_audit_event_branch_id ON finance_audit_event(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_audit_event_actor_id ON finance_audit_event(actor_id);

CREATE INDEX IF NOT EXISTS idx_finance_audit_event_request_id ON finance_audit_event(request_id);

CREATE INDEX IF NOT EXISTS idx_finance_audit_event_entity_id ON finance_audit_event(entity_id);

CREATE INDEX IF NOT EXISTS idx_finance_audit_event_source_id ON finance_audit_event(source_id);

CREATE INDEX IF NOT EXISTS idx_finance_budget_company_id ON finance_budget(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_budget_branch_id ON finance_budget(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_budget_status ON finance_budget(status);

CREATE INDEX IF NOT EXISTS idx_finance_company_parent_company_id ON finance_company(parent_company_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_analysis_company_id ON finance_health_analysis(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_analysis_branch_id ON finance_health_analysis(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_analysis_status ON finance_health_analysis(status);

CREATE INDEX IF NOT EXISTS idx_finance_health_analysis_started_by_id ON finance_health_analysis(started_by_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_finding_analysis_id ON finance_health_finding(analysis_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_finding_company_id ON finance_health_finding(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_finding_branch_id ON finance_health_finding(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_finding_control_id ON finance_health_finding(control_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_finding_status ON finance_health_finding(status);

CREATE INDEX IF NOT EXISTS idx_finance_health_finding_pending_review_id ON finance_health_finding(pending_review_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_finding_reviewed_by_id ON finance_health_finding(reviewed_by_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_review_analysis_id ON finance_health_review(analysis_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_review_company_id ON finance_health_review(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_review_branch_id ON finance_health_review(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_review_finding_id ON finance_health_review(finding_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_review_submitted_by_id ON finance_health_review(submitted_by_id);

CREATE INDEX IF NOT EXISTS idx_finance_health_review_status ON finance_health_review(status);

CREATE INDEX IF NOT EXISTS idx_finance_health_review_reviewed_by_id ON finance_health_review(reviewed_by_id);

CREATE INDEX IF NOT EXISTS idx_finance_journal_company_id ON finance_journal(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_journal_branch_id ON finance_journal(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_journal_proposal_id ON finance_journal(proposal_id);

CREATE INDEX IF NOT EXISTS idx_finance_journal_status ON finance_journal(status);

CREATE INDEX IF NOT EXISTS idx_finance_journal_source_id ON finance_journal(source_id);

CREATE INDEX IF NOT EXISTS idx_finance_journal_prepared_by_id ON finance_journal(prepared_by_id);

CREATE INDEX IF NOT EXISTS idx_finance_journal_reviewed_by_id ON finance_journal(reviewed_by_id);

CREATE INDEX IF NOT EXISTS idx_finance_ledger_line_company_id ON finance_ledger_line(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_ledger_line_branch_id ON finance_ledger_line(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_ledger_line_journal_id ON finance_ledger_line(journal_id);

CREATE INDEX IF NOT EXISTS idx_finance_ledger_line_delivery_partner_id ON finance_ledger_line(delivery_partner_id);

CREATE INDEX IF NOT EXISTS idx_finance_posting_issue_company_id ON finance_posting_issue(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_posting_issue_branch_id ON finance_posting_issue(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_posting_issue_source_id ON finance_posting_issue(source_id);

CREATE INDEX IF NOT EXISTS idx_finance_posting_issue_status ON finance_posting_issue(status);

CREATE INDEX IF NOT EXISTS idx_finance_proposal_company_id ON finance_proposal(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_proposal_branch_id ON finance_proposal(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_proposal_source_id ON finance_proposal(source_id);

CREATE INDEX IF NOT EXISTS idx_finance_proposal_prepared_by_id ON finance_proposal(prepared_by_id);

CREATE INDEX IF NOT EXISTS idx_finance_proposal_status ON finance_proposal(status);

CREATE INDEX IF NOT EXISTS idx_finance_proposal_decision_id ON finance_proposal(decision_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_assessment_company_id ON finance_tax_assessment(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_assessment_branch_id ON finance_tax_assessment(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_assessment_source_id ON finance_tax_assessment(source_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_assessment_request_id ON finance_tax_assessment(request_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_assessment_counterparty_tax_id ON finance_tax_assessment(counterparty_tax_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_assessment_employee_id ON finance_tax_assessment(employee_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_assessment_missing_counterparty_id ON finance_tax_assessment(missing_counterparty_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_config_company_id ON finance_tax_config(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_config_output_account_id ON finance_tax_config(output_account_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_config_input_account_id ON finance_tax_config(input_account_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_document_company_id ON finance_tax_document(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_document_branch_id ON finance_tax_document(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_document_request_id ON finance_tax_document(request_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_document_counterparty_tax_id ON finance_tax_document(counterparty_tax_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_rule_company_id ON finance_tax_rule(company_id);

CREATE INDEX IF NOT EXISTS idx_finance_tax_rule_request_id ON finance_tax_rule(request_id);

CREATE INDEX IF NOT EXISTS idx_finance_variance_alert_config_owner_user_id ON finance_variance_alert_config(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_food_cost_calculation_branch_id ON food_cost_calculation(branch_id);

CREATE INDEX IF NOT EXISTS idx_food_cost_calculation_order_id ON food_cost_calculation(order_id);

CREATE INDEX IF NOT EXISTS idx_food_cost_calculation_menu_item_id ON food_cost_calculation(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_category_branch_id ON inventory_category(branch_id);

CREATE INDEX IF NOT EXISTS idx_inventory_item_branch_id ON inventory_item(branch_id);

CREATE INDEX IF NOT EXISTS idx_inventory_item_category_id ON inventory_item(category_id);

CREATE INDEX IF NOT EXISTS idx_inventory_item_supplier_id ON inventory_item(supplier_id);

CREATE INDEX IF NOT EXISTS idx_inventory_item_storage_location_id ON inventory_item(storage_location_id);

CREATE INDEX IF NOT EXISTS idx_journal_entry_branch_id ON journal_entry(branch_id);

CREATE INDEX IF NOT EXISTS idx_journal_entry_reference_id ON journal_entry(reference_id);

CREATE INDEX IF NOT EXISTS idx_journal_entry_catering_event_id ON journal_entry(catering_event_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_item_assignment_event_id ON kitchen_item_assignment(event_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_item_assignment_quote_id ON kitchen_item_assignment(quote_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_item_assignment_employee_id ON kitchen_item_assignment(employee_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_manual_branch_id ON kitchen_manual(branch_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_manual_status ON kitchen_manual(status);

CREATE INDEX IF NOT EXISTS idx_kitchen_manual_menu_item_id ON kitchen_manual(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_purchase_request_branch_id ON kitchen_purchase_request(branch_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_purchase_request_production_order_id ON kitchen_purchase_request(production_order_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_purchase_request_catering_event_id ON kitchen_purchase_request(catering_event_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_purchase_request_inventory_item_id ON kitchen_purchase_request(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_purchase_request_status ON kitchen_purchase_request(status);

CREATE INDEX IF NOT EXISTS idx_kitchen_purchase_request_purchase_order_id ON kitchen_purchase_request(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_release_slip_branch_id ON kitchen_release_slip(branch_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_release_slip_event_id ON kitchen_release_slip(event_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_release_slip_status ON kitchen_release_slip(status);

CREATE INDEX IF NOT EXISTS idx_kitchen_release_slip_created_from_quote_id ON kitchen_release_slip(created_from_quote_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_release_slip_requisition_id ON kitchen_release_slip(requisition_id);

CREATE INDEX IF NOT EXISTS idx_lead_external_id ON lead(external_id);

CREATE INDEX IF NOT EXISTS idx_lead_email ON lead(email);

CREATE INDEX IF NOT EXISTS idx_lead_referrer_event_id ON lead(referrer_event_id);

CREATE INDEX IF NOT EXISTS idx_lead_status ON lead(status);

CREATE INDEX IF NOT EXISTS idx_lead_converted_client_id ON lead(converted_client_id);

CREATE INDEX IF NOT EXISTS idx_level_upgrade_request_client_id ON level_upgrade_request(client_id);

CREATE INDEX IF NOT EXISTS idx_level_upgrade_request_requested_level_id ON level_upgrade_request(requested_level_id);

CREATE INDEX IF NOT EXISTS idx_level_upgrade_request_status ON level_upgrade_request(status);

CREATE INDEX IF NOT EXISTS idx_menu_category_branch_id ON menu_category(branch_id);

CREATE INDEX IF NOT EXISTS idx_menu_category_section_id ON menu_category(section_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_branch_id ON menu_item(branch_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_manual_entry_id ON menu_item(manual_entry_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_option_menu_item_id ON menu_item_option(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_option_option_id ON menu_item_option(option_id);

CREATE INDEX IF NOT EXISTS idx_menu_profitability_analysis_branch_id ON menu_profitability_analysis(branch_id);

CREATE INDEX IF NOT EXISTS idx_menu_profitability_analysis_menu_item_id ON menu_profitability_analysis(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_menu_section_branch_id ON menu_section(branch_id);

CREATE INDEX IF NOT EXISTS idx_milestone_achievement_client_id ON milestone_achievement(client_id);

CREATE INDEX IF NOT EXISTS idx_milestone_achievement_milestone_id ON milestone_achievement(milestone_id);

CREATE INDEX IF NOT EXISTS idx_notification_client_id ON notification(client_id);

CREATE INDEX IF NOT EXISTS idx_notification_employee_id ON notification(employee_id);

CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_entity_id ON notification(entity_id);

CREATE INDEX IF NOT EXISTS idx_operational_meeting_branch_id ON operational_meeting(branch_id);

CREATE INDEX IF NOT EXISTS idx_operational_meeting_status ON operational_meeting(status);

CREATE INDEX IF NOT EXISTS idx_order_branch_id ON "order"(branch_id);

CREATE INDEX IF NOT EXISTS idx_order_customer_id ON "order"(customer_id);

CREATE INDEX IF NOT EXISTS idx_order_table_id ON "order"(table_id);

CREATE INDEX IF NOT EXISTS idx_order_delivery_address_id ON "order"(delivery_address_id);

CREATE INDEX IF NOT EXISTS idx_order_delivery_person_id ON "order"(delivery_person_id);

CREATE INDEX IF NOT EXISTS idx_order_delivery_company_id ON "order"(delivery_company_id);

CREATE INDEX IF NOT EXISTS idx_order_delivery_zone_id ON "order"(delivery_zone_id);

CREATE INDEX IF NOT EXISTS idx_order_voice_order_id ON "order"(voice_order_id);

CREATE INDEX IF NOT EXISTS idx_order_promo_code_id ON "order"(promo_code_id);

CREATE INDEX IF NOT EXISTS idx_order_status ON "order"(status);

CREATE INDEX IF NOT EXISTS idx_order_stripe_payment_intent_id ON "order"(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_order_change_log_order_id ON order_change_log(order_id);

CREATE INDEX IF NOT EXISTS idx_order_change_log_table_id ON order_change_log(table_id);

CREATE INDEX IF NOT EXISTS idx_order_change_log_session_id ON order_change_log(session_id);

CREATE INDEX IF NOT EXISTS idx_page_view_user_id ON page_view(user_id);

CREATE INDEX IF NOT EXISTS idx_page_view_session_id ON page_view(session_id);

CREATE INDEX IF NOT EXISTS idx_payout_client_id ON payout(client_id);

CREATE INDEX IF NOT EXISTS idx_payout_status ON payout(status);

CREATE INDEX IF NOT EXISTS idx_payroll_disbursement_employee_id ON payroll_disbursement(employee_id);

CREATE INDEX IF NOT EXISTS idx_payroll_disbursement_branch_id ON payroll_disbursement(branch_id);

CREATE INDEX IF NOT EXISTS idx_payroll_disbursement_salary_record_id ON payroll_disbursement(salary_record_id);

CREATE INDEX IF NOT EXISTS idx_payroll_disbursement_status ON payroll_disbursement(status);

CREATE INDEX IF NOT EXISTS idx_payslip_employee_id ON payslip(employee_id);

CREATE INDEX IF NOT EXISTS idx_payslip_branch_id ON payslip(branch_id);

CREATE INDEX IF NOT EXISTS idx_payslip_status ON payslip(status);

CREATE INDEX IF NOT EXISTS idx_performance_appraisal_employee_record_id ON performance_appraisal(employee_record_id);

CREATE INDEX IF NOT EXISTS idx_performance_appraisal_branch_id ON performance_appraisal(branch_id);

CREATE INDEX IF NOT EXISTS idx_performance_appraisal_status ON performance_appraisal(status);

CREATE INDEX IF NOT EXISTS idx_performance_appraisal_proposed_by_id ON performance_appraisal(proposed_by_id);

CREATE INDEX IF NOT EXISTS idx_performance_appraisal_decided_by_id ON performance_appraisal(decided_by_id);

CREATE INDEX IF NOT EXISTS idx_permission_sync_log_user_id ON permission_sync_log(user_id);

CREATE INDEX IF NOT EXISTS idx_permission_sync_log_status ON permission_sync_log(status);

CREATE INDEX IF NOT EXISTS idx_preparation_area_printer_id ON preparation_area(printer_id);

CREATE INDEX IF NOT EXISTS idx_primal_cut_slaughter_event_id ON primal_cut(slaughter_event_id);

CREATE INDEX IF NOT EXISTS idx_printer_branch_id ON printer(branch_id);

CREATE INDEX IF NOT EXISTS idx_processing_batch_branch_id ON processing_batch(branch_id);

CREATE INDEX IF NOT EXISTS idx_processing_batch_status ON processing_batch(status);

CREATE INDEX IF NOT EXISTS idx_production_order_recipe_id ON production_order(recipe_id);

CREATE INDEX IF NOT EXISTS idx_production_order_output_item_id ON production_order(output_item_id);

CREATE INDEX IF NOT EXISTS idx_production_order_status ON production_order(status);

CREATE INDEX IF NOT EXISTS idx_production_order_branch_id ON production_order(branch_id);

CREATE INDEX IF NOT EXISTS idx_production_order_catering_event_id ON production_order(catering_event_id);

CREATE INDEX IF NOT EXISTS idx_production_order_parent_production_order_id ON production_order(parent_production_order_id);

CREATE INDEX IF NOT EXISTS idx_promo_code_branch_id ON promo_code(branch_id);

CREATE INDEX IF NOT EXISTS idx_purchase_client_id ON purchase(client_id);

CREATE INDEX IF NOT EXISTS idx_purchase_referrer_id ON purchase(referrer_id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_branch_id ON purchase_invoice(branch_id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_supplier_id ON purchase_invoice(supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_status ON purchase_invoice(status);

CREATE INDEX IF NOT EXISTS idx_purchase_order_branch_id ON purchase_order(branch_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_inventory_category_id ON purchase_order(inventory_category_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier_id ON purchase_order(supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_status ON purchase_order(status);

CREATE INDEX IF NOT EXISTS idx_purchase_order_catering_event_id ON purchase_order(catering_event_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_purchase_recorded_invoice_id ON purchase_order(purchase_recorded_invoice_id);

CREATE INDEX IF NOT EXISTS idx_purchase_submission_client_id ON purchase_submission(client_id);

CREATE INDEX IF NOT EXISTS idx_purchase_submission_status ON purchase_submission(status);

CREATE INDEX IF NOT EXISTS idx_recipe_output_item_id ON recipe(output_item_id);

CREATE INDEX IF NOT EXISTS idx_recipe_product_owner_id ON recipe(product_owner_id);

CREATE INDEX IF NOT EXISTS idx_recipe_branch_id ON recipe(branch_id);

CREATE INDEX IF NOT EXISTS idx_recipe_status ON recipe(status);

CREATE INDEX IF NOT EXISTS idx_recommendation_event_client_id ON recommendation_event(client_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_event_recommended_item_id ON recommendation_event(recommended_item_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_event_order_id ON recommendation_event(order_id);

CREATE INDEX IF NOT EXISTS idx_redemption_client_id ON redemption(client_id);

CREATE INDEX IF NOT EXISTS idx_redemption_reward_id ON redemption(reward_id);

CREATE INDEX IF NOT EXISTS idx_redemption_status ON redemption(status);

CREATE INDEX IF NOT EXISTS idx_referral_bonus_referrer_id ON referral_bonus(referrer_id);

CREATE INDEX IF NOT EXISTS idx_referral_bonus_referred_client_id ON referral_bonus(referred_client_id);

CREATE INDEX IF NOT EXISTS idx_referral_bonus_redemption_id ON referral_bonus(redemption_id);

CREATE INDEX IF NOT EXISTS idx_registration_request_email ON registration_request(email);

CREATE INDEX IF NOT EXISTS idx_registration_request_referrer_id ON registration_request(referrer_id);

CREATE INDEX IF NOT EXISTS idx_registration_request_registration_level_id ON registration_request(registration_level_id);

CREATE INDEX IF NOT EXISTS idx_registration_request_status ON registration_request(status);

CREATE INDEX IF NOT EXISTS idx_requisition_branch_id ON requisition(branch_id);

CREATE INDEX IF NOT EXISTS idx_requisition_event_id ON requisition(event_id);

CREATE INDEX IF NOT EXISTS idx_requisition_created_from_quote_id ON requisition(created_from_quote_id);

CREATE INDEX IF NOT EXISTS idx_requisition_status ON requisition(status);

CREATE INDEX IF NOT EXISTS idx_requisition_chef_user_id ON requisition(chef_user_id);

CREATE INDEX IF NOT EXISTS idx_requisition_line_requisition_id ON requisition_line(requisition_id);

CREATE INDEX IF NOT EXISTS idx_requisition_line_event_id ON requisition_line(event_id);

CREATE INDEX IF NOT EXISTS idx_requisition_line_branch_id ON requisition_line(branch_id);

CREATE INDEX IF NOT EXISTS idx_requisition_line_inventory_item_id ON requisition_line(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_requisition_line_production_order_id ON requisition_line(production_order_id);

CREATE INDEX IF NOT EXISTS idx_requisition_line_reservation_id ON requisition_line(reservation_id);

CREATE INDEX IF NOT EXISTS idx_requisition_revision_requisition_id ON requisition_revision(requisition_id);

CREATE INDEX IF NOT EXISTS idx_requisition_revision_event_id ON requisition_revision(event_id);

CREATE INDEX IF NOT EXISTS idx_requisition_revision_branch_id ON requisition_revision(branch_id);

CREATE INDEX IF NOT EXISTS idx_requisition_revision_actor_user_id ON requisition_revision(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_info_branch_id ON restaurant_info(branch_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_info_email ON restaurant_info(email);

CREATE INDEX IF NOT EXISTS idx_restaurant_location_branch_id ON restaurant_location(branch_id);

CREATE INDEX IF NOT EXISTS idx_return_branch_id ON return(branch_id);

CREATE INDEX IF NOT EXISTS idx_return_session_id ON return(session_id);

CREATE INDEX IF NOT EXISTS idx_return_order_id ON return(order_id);

CREATE INDEX IF NOT EXISTS idx_return_status ON return(status);

CREATE INDEX IF NOT EXISTS idx_review_branch_id ON review(branch_id);

CREATE INDEX IF NOT EXISTS idx_review_menu_item_id ON review(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_review_client_id ON review(client_id);

CREATE INDEX IF NOT EXISTS idx_review_order_id ON review(order_id);

CREATE INDEX IF NOT EXISTS idx_review_status ON review(status);

CREATE INDEX IF NOT EXISTS idx_salary_penalty_branch_id ON salary_penalty(branch_id);

CREATE INDEX IF NOT EXISTS idx_salary_penalty_employee_id ON salary_penalty(employee_id);

CREATE INDEX IF NOT EXISTS idx_salary_penalty_status ON salary_penalty(status);

CREATE INDEX IF NOT EXISTS idx_salary_penalty_applied_salary_record_id ON salary_penalty(applied_salary_record_id);

CREATE INDEX IF NOT EXISTS idx_salary_record_branch_id ON salary_record(branch_id);

CREATE INDEX IF NOT EXISTS idx_salary_record_employee_id ON salary_record(employee_id);

CREATE INDEX IF NOT EXISTS idx_salary_revision_employee_record_id ON salary_revision(employee_record_id);

CREATE INDEX IF NOT EXISTS idx_salary_revision_branch_id ON salary_revision(branch_id);

CREATE INDEX IF NOT EXISTS idx_salary_revision_status ON salary_revision(status);

CREATE INDEX IF NOT EXISTS idx_salary_revision_proposed_by_id ON salary_revision(proposed_by_id);

CREATE INDEX IF NOT EXISTS idx_salary_revision_decided_by_id ON salary_revision(decided_by_id);

CREATE INDEX IF NOT EXISTS idx_shared_report_link_reference_id ON shared_report_link(reference_id);

CREATE INDEX IF NOT EXISTS idx_shift_branch_id ON shift(branch_id);

CREATE INDEX IF NOT EXISTS idx_shift_employee_id ON shift(employee_id);

CREATE INDEX IF NOT EXISTS idx_shift_catering_event_id ON shift(catering_event_id);

CREATE INDEX IF NOT EXISTS idx_shift_catering_assignment_id ON shift(catering_assignment_id);

CREATE INDEX IF NOT EXISTS idx_shift_status ON shift(status);

CREATE INDEX IF NOT EXISTS idx_slaughter_event_animal_id ON slaughter_event(animal_id);

CREATE INDEX IF NOT EXISTS idx_slaughter_event_processing_batch_id ON slaughter_event(processing_batch_id);

CREATE INDEX IF NOT EXISTS idx_smsnotification_preferences_user_id ON smsnotification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_social_media_connection_account_id ON social_media_connection(account_id);

CREATE INDEX IF NOT EXISTS idx_social_media_connection_app_id ON social_media_connection(app_id);

CREATE INDEX IF NOT EXISTS idx_storage_location_branch_id ON storage_location(branch_id);

CREATE INDEX IF NOT EXISTS idx_supplier_email ON supplier(email);

CREATE INDEX IF NOT EXISTS idx_supplier_review_supplier_id ON supplier_review(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_review_purchase_order_id ON supplier_review(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_system_settings_default_root_client_id ON system_settings(default_root_client_id);

CREATE INDEX IF NOT EXISTS idx_system_settings_default_pos_client_id ON system_settings(default_pos_client_id);

CREATE INDEX IF NOT EXISTS idx_table_branch_id ON "table"(branch_id);

CREATE INDEX IF NOT EXISTS idx_table_status ON "table"(status);

CREATE INDEX IF NOT EXISTS idx_table_current_order_id ON "table"(current_order_id);

CREATE INDEX IF NOT EXISTS idx_table_feedback_branch_id ON table_feedback(branch_id);

CREATE INDEX IF NOT EXISTS idx_table_feedback_client_id ON table_feedback(client_id);

CREATE INDEX IF NOT EXISTS idx_talabat_receipt_branch_id ON talabat_receipt(branch_id);

CREATE INDEX IF NOT EXISTS idx_talabat_receipt_client_id ON talabat_receipt(client_id);

CREATE INDEX IF NOT EXISTS idx_talabat_receipt_order_id ON talabat_receipt(order_id);

CREATE INDEX IF NOT EXISTS idx_talabat_receipt_status ON talabat_receipt(status);

CREATE INDEX IF NOT EXISTS idx_user_portal_client_id ON "user"(portal_client_id);

CREATE INDEX IF NOT EXISTS idx_user_perm_branch_id ON "user"(perm_branch_id);

CREATE INDEX IF NOT EXISTS idx_user_perm_employee_id ON "user"(perm_employee_id);

CREATE INDEX IF NOT EXISTS idx_user_perm_delivery_person_id ON "user"(perm_delivery_person_id);

CREATE INDEX IF NOT EXISTS idx_user_perm_client_id ON "user"(perm_client_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_client_id ON user_notification_preferences(client_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_email ON user_notification_preferences(email);

CREATE INDEX IF NOT EXISTS idx_user_permissions_branch_id ON user_permissions(branch_id);

CREATE INDEX IF NOT EXISTS idx_visa_credit_session_id ON visa_credit(session_id);

CREATE INDEX IF NOT EXISTS idx_visa_credit_delivery_company_id ON visa_credit(delivery_company_id);

CREATE INDEX IF NOT EXISTS idx_visa_credit_status ON visa_credit(status);

CREATE INDEX IF NOT EXISTS idx_voice_order_delivery_zone_id ON voice_order(delivery_zone_id);

CREATE INDEX IF NOT EXISTS idx_voice_order_status ON voice_order(status);

CREATE INDEX IF NOT EXISTS idx_voice_order_branch_id ON voice_order(branch_id);

CREATE INDEX IF NOT EXISTS idx_voice_order_created_order_id ON voice_order(created_order_id);

CREATE INDEX IF NOT EXISTS idx_waste_by_product_slaughter_event_id ON waste_by_product(slaughter_event_id);

CREATE INDEX IF NOT EXISTS idx_waste_by_product_primal_cut_id ON waste_by_product(primal_cut_id);

CREATE INDEX IF NOT EXISTS idx_waste_by_product_raw_material_id ON waste_by_product(raw_material_id);

CREATE INDEX IF NOT EXISTS idx_waste_declaration_branch_id ON waste_declaration(branch_id);

CREATE INDEX IF NOT EXISTS idx_waste_declaration_event_id ON waste_declaration(event_id);

CREATE INDEX IF NOT EXISTS idx_waste_declaration_inventory_item_id ON waste_declaration(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_waste_declaration_category_id ON waste_declaration(category_id);

CREATE INDEX IF NOT EXISTS idx_waste_declaration_status ON waste_declaration(status);


-- Row Level Security (RLS) Policies

ALTER TABLE active_offer ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'active_offer' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON active_offer FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE address ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'address' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON address FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE animal ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'animal' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON animal FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON attendance FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE attendance_policy ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_policy' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON attendance_policy FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON audit_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE balance_recharge ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'balance_recharge' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON balance_recharge FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE borrowing_policy ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrowing_policy' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON borrowing_policy FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE branch ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branch' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON branch FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE butchery_expense ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'butchery_expense' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON butchery_expense FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE butchery_raw_material ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'butchery_raw_material' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON butchery_raw_material FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE butchery_supplier ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'butchery_supplier' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON butchery_supplier FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE campaign_recipient ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_recipient' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON campaign_recipient FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE cashback_distribution_pending ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_distribution_pending' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON cashback_distribution_pending FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE cashback_rule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_rule' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON cashback_rule FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE cashback_rule_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_rule_history' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON cashback_rule_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE cashback_tier ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_tier' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON cashback_tier FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE cashback_transaction ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_transaction' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON cashback_transaction FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE cashier_purchase ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashier_purchase' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON cashier_purchase FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE cashier_session ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashier_session' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON cashier_session FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_actual_cost_run ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_actual_cost_run' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_actual_cost_run FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_assignment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_assignment' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_assignment FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_cancellation_policy ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_cancellation_policy' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_cancellation_policy FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_cost_exception ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_cost_exception' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_cost_exception FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_custody_checkpoint ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_custody_checkpoint' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_custody_checkpoint FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_equipment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_equipment' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_equipment FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_equipment_maintenance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_equipment_maintenance' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_equipment_maintenance FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_equipment_reservation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_equipment_reservation' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_equipment_reservation FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_equipment_unit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_equipment_unit' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_equipment_unit FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_event ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_event' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_event FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_event_type_discount ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_event_type_discount' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_event_type_discount FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_invitation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_invitation' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_invitation FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_media_vendor ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_media_vendor' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_media_vendor FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_option ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_option' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_option FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_package ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_package' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_package FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_pass_branding ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_pass_branding' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_pass_branding FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_payment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_payment' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_payment FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_payment_review_lock ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_payment_review_lock' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_payment_review_lock FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_portal_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_portal_access' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_portal_access FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_portal_quote_override ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_portal_quote_override' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_portal_quote_override FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_procurement_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_procurement_settings' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_procurement_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_quote ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_quote' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_quote FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_reconciliation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_reconciliation' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_reconciliation FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_reservation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_reservation' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_reservation FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_returned_item ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_returned_item' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_returned_item FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_settings' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_staff_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_staff_feedback' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_staff_feedback FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_staffing_role ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_staffing_role' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_staffing_role FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_transfer_proof ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_transfer_proof' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_transfer_proof FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_trip ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_trip' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_trip FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE catering_vehicle ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catering_vehicle' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON catering_vehicle FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE client ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON client FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE client_interaction ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_interaction' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON client_interaction FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE client_segment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_segment' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON client_segment FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE contact_rate_limit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_rate_limit' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON contact_rate_limit FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE daily_financial_summary ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_financial_summary' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON daily_financial_summary FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE delivery_bonus_record ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_bonus_record' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON delivery_bonus_record FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE delivery_bonus_tier ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_bonus_tier' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON delivery_bonus_tier FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE delivery_company ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_company' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON delivery_company FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE delivery_message ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_message' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON delivery_message FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE delivery_person ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_person' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON delivery_person FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE delivery_receipt_compliance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_receipt_compliance' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON delivery_receipt_compliance FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE delivery_zone ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_zone' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON delivery_zone FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE department ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'department' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON department FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE deposit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deposit' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON deposit FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE disciplinary_action ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disciplinary_action' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON disciplinary_action FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE email_notification_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_notification_settings' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON email_notification_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE employee ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON employee FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE employee_borrowing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_borrowing' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON employee_borrowing FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE employee_private ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_private' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON employee_private FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE ex_employee ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_employee' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON ex_employee FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE expense ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON expense FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE expiry_report ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expiry_report' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON expiry_report FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_account ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_account' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_account FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_audit_event ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_audit_event' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_audit_event FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_budget ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_budget' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_budget FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_company ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_company' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_company FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_health_analysis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_health_analysis' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_health_analysis FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_health_finding ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_health_finding' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_health_finding FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_health_review ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_health_review' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_health_review FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_journal ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_journal' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_journal FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_ledger_line ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_ledger_line' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_ledger_line FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_manual_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_manual_status' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_manual_status FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_posting_issue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_posting_issue' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_posting_issue FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_proposal ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_proposal' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_proposal FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_tax_assessment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_tax_assessment' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_tax_assessment FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_tax_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_tax_config' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_tax_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_tax_document ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_tax_document' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_tax_document FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_tax_rule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_tax_rule' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_tax_rule FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_variance_alert_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_variance_alert_config' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON finance_variance_alert_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE food_cost_calculation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'food_cost_calculation' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON food_cost_calculation FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE glaccount ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'glaccount' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON glaccount FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE inventory_category ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_category' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON inventory_category FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE inventory_item ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_item' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON inventory_item FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE job_run_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_run_log' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON job_run_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE journal_entry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entry' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON journal_entry FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE kitchen_item_assignment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kitchen_item_assignment' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON kitchen_item_assignment FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE kitchen_manual ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kitchen_manual' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON kitchen_manual FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE kitchen_purchase_request ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kitchen_purchase_request' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON kitchen_purchase_request FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE kitchen_release_slip ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kitchen_release_slip' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON kitchen_release_slip FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE lead ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON lead FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE lead_source_mapping ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_source_mapping' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON lead_source_mapping FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE level_upgrade_request ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'level_upgrade_request' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON level_upgrade_request FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE loyalty_tier ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_tier' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON loyalty_tier FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE marketing_campaign ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketing_campaign' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON marketing_campaign FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE menu_category ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_category' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON menu_category FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE menu_item ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_item' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON menu_item FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE menu_item_option ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_item_option' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON menu_item_option FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE menu_option ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_option' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON menu_option FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE menu_profitability_analysis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_profitability_analysis' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON menu_profitability_analysis FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE menu_section ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_section' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON menu_section FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE milestone_achievement ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestone_achievement' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON milestone_achievement FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON notification FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE operational_meeting ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operational_meeting' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON operational_meeting FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON "order" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE order_change_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_change_log' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON order_change_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE page_view ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'page_view' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON page_view FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE payout ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payout' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON payout FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE payroll_disbursement ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_disbursement' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON payroll_disbursement FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_settings' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON payroll_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE payslip ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payslip' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON payslip FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE performance_appraisal ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'performance_appraisal' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON performance_appraisal FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE permission_sync_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'permission_sync_log' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON permission_sync_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE preparation_area ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preparation_area' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON preparation_area FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE primal_cut ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'primal_cut' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON primal_cut FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE printer ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'printer' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON printer FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE processing_batch ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'processing_batch' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON processing_batch FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE production_order ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'production_order' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON production_order FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE promo_code ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promo_code' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON promo_code FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE purchase ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON purchase FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE purchase_invoice ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_invoice' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON purchase_invoice FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE purchase_order ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON purchase_order FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE purchase_submission ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_submission' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON purchase_submission FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE recharge_user_tier ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recharge_user_tier' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON recharge_user_tier FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE recipe ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipe' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON recipe FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE recommendation_event ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recommendation_event' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON recommendation_event FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE redemption ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'redemption' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON redemption FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE referral_bonus ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referral_bonus' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON referral_bonus FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE referral_milestone ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referral_milestone' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON referral_milestone FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE registration_level ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registration_level' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON registration_level FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE registration_request ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registration_request' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON registration_request FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE report_recipient_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_recipient_settings' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON report_recipient_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE requisition ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requisition' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON requisition FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE requisition_line ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requisition_line' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON requisition_line FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE requisition_revision ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requisition_revision' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON requisition_revision FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE restaurant_info ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_info' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON restaurant_info FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE restaurant_location ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_location' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON restaurant_location FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE return ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'return' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON return FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE review ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON review FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE reward ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reward' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON reward FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE reward_category ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reward_category' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON reward_category FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE rework_event ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rework_event' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON rework_event FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE role ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON role FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE salary_penalty ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_penalty' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON salary_penalty FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE salary_record ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_record' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON salary_record FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE salary_revision ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_revision' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON salary_revision FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_settings' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON schedule_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE shared_report_link ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shared_report_link' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON shared_report_link FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE shift ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shift' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON shift FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE slaughter_event ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'slaughter_event' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON slaughter_event FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE smsnotification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'smsnotification_preferences' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON smsnotification_preferences FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE social_media_connection ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_media_connection' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON social_media_connection FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE storage_location ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'storage_location' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON storage_location FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON supplier FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE supplier_review ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_review' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON supplier_review FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON system_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "table" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'table' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON "table" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE table_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'table_feedback' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON table_feedback FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE talabat_receipt ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'talabat_receipt' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON talabat_receipt FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE ui_translation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ui_translation' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON ui_translation FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON "user" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notification_preferences' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON user_notification_preferences FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON user_permissions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE vendor_support_info ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_support_info' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON vendor_support_info FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE vera_kit360_manual_section ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vera_kit360_manual_section' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON vera_kit360_manual_section FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE visa_credit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'visa_credit' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON visa_credit FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE voice_order ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_order' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON voice_order FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE waste_by_product ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waste_by_product' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON waste_by_product FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE waste_declaration ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waste_declaration' AND policyname = 'Allow all for now') THEN
    CREATE POLICY "Allow all for now" ON waste_declaration FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;