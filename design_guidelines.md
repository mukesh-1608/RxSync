# Design Guidelines: Image-to-XML Automation Web Application

## Design Approach
**System-Based Approach**: Material Design principles adapted for medical/pharmaceutical context
- Prioritizes clarity, efficiency, and data processing workflows
- Emphasizes functional hierarchy over decorative elements
- Focus on usability and accessibility for productivity tools

## Core Design Principles
1. **Medical Professional Aesthetic**: Clean, trustworthy, clinical precision
2. **Process-Driven UX**: Clear 4-step workflow with visible progress
3. **Data-First Design**: Emphasize readability of parsed information
4. **No-Nonsense Efficiency**: Minimal decoration, maximum functionality

## Typography System
- **Primary Font**: Inter or similar sans-serif from Google Fonts
- **Headings**: 
  - H1 (App Title): font-bold text-3xl
  - H2 (Step Headers): font-semibold text-2xl
  - H3 (Section Headers): font-medium text-xl
- **Body Text**: text-base leading-relaxed
- **Data/Code**: Monospace font (JetBrains Mono) for XML/CSV preview
- **Table Text**: text-sm for dense data display

## Layout System
**Spacing Units**: Tailwind units of 4, 6, 8, 12, 16 (p-4, m-6, gap-8, py-12, px-16)
- Consistent vertical rhythm between major sections: py-12
- Card padding: p-6
- Button padding: px-6 py-3
- Table cell padding: p-4

**Container Strategy**:
- Max-width container: max-w-7xl mx-auto
- Full-width sections with inner constraints
- Generous whitespace between process steps

## Component Library

### 1. Progress Stepper (Top of Page)
- Horizontal step indicator: 4 numbered circles connected by lines
- Active step: filled circle with primary color
- Completed steps: checkmark icon
- Future steps: outlined circle with muted color
- Step labels below each circle

### 2. Upload Zone
- Large dashed border drag-and-drop area (min-h-64)
- Center-aligned upload icon and instruction text
- "Browse Files" button as secondary action
- Image preview grid below: grid-cols-2 md:grid-cols-4 gap-4
- Each preview: thumbnail with filename and remove button

### 3. Processing Indicators
- Individual progress bars for each image
- Status badges: Pending (gray), Processing (blue), Complete (green), Error (red)
- Spinner icons during active processing
- Collapsible raw text panels with monospace font

### 4. Data Table (Editable)
- Sticky header row with all 44 column names
- Alternating row colors for readability
- Inline editing: click cell to edit mode
- Sortable columns with arrow indicators
- Horizontal scroll for wide data
- Border styling: border border-gray-200

### 5. Action Buttons
- Primary actions: Solid blue buttons with white text
- Secondary actions: Outlined buttons
- Download buttons: Include download icon
- Button hierarchy: Process > Download CSV > Generate XML > Download XML

### 6. XML/CSV Preview Panels
- Syntax highlighting for XML (colored tags, attributes, values)
- Monospace font display
- Copy-to-clipboard button in header
- Max height with scroll: max-h-96 overflow-y-auto
- Light gray background for code blocks

### 7. Toast Notifications
- Position: top-right corner
- Success: green background with checkmark
- Error: red background with X icon
- Auto-dismiss after 5 seconds
- Slide-in animation

## Visual Hierarchy
1. **Step Headers**: Largest, bold, with step number
2. **Action Buttons**: High contrast, clear CTAs at each step
3. **Data Display**: Clean tables and formatted text
4. **Supporting UI**: Progress bars, status badges, helper text

## Responsive Behavior
- Desktop (lg): Full 4-column layout for previews, wide tables
- Tablet (md): 2-column previews, scrollable tables
- Mobile: Single column stack, simplified table view

## Accessibility Implementation
- All buttons with proper ARIA labels
- Keyboard navigation for entire workflow
- Focus indicators on interactive elements
- High contrast ratios (4.5:1 minimum)
- Screen reader announcements for progress updates
- Form inputs with associated labels

## Animation Strategy
**Minimal and Purposeful Only**:
- Progress bar fill animations
- Toast notification slide-in
- Step completion checkmark appearance
- Loading spinners during OCR processing
- NO decorative animations

## Images
**No hero images or decorative photography** - This is a utility application focused on data processing. All visual elements serve functional purposes (icons, previews, UI elements).