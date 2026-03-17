# SmartInvest Corporate Theme - Quick Reference Guide

## Color Palette

### Primary Colors
```css
--primary-corporate: #0B1F33;  /* Deep Navy - Headers, Main Text */
--primary-light: #1a365d;      /* Corporate Blue - Secondary */
```

### Accent Colors
```css
--accent-gold: #D4AF37;        /* Premium Gold - Highlights, Text */
--accent-light-gold: #f4d03f;  /* Light Gold - Hover States */
--accent-teal: #0891b2;        /* Modern Teal - Icons, Features */
```

### Utility Colors
```css
--bg-dark: #05111e;            /* Very Dark Blue - Backgrounds */
--text-light: #f8fafc;         /* Off-white - Light text */
--border-color: #1e3a5f;       /* Subtle Border Color */
```

---

## Component Styling

### Navigation Bar
```css
background: linear-gradient(135deg, #0B1F33 0%, #1a365d 100%);
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
```

**Elements:**
- Brand Name: Gold (#D4AF37)
- Links: White (0.85 opacity)
- Links Hover: Gold (#D4AF37)
- Links Active: Gold with bottom border

### Admin Button (Top Right)
```css
background: linear-gradient(135deg, #D4AF37 0%, #f4d03f 100%);
color: #0B1F33;
padding: 8px 20px;
border-radius: 6px;
font-weight: 700;
```

**Hover State:**
- Transform: translateY(-2px)
- Box Shadow: 0 8px 16px rgba(212, 175, 55, 0.3)

### Primary Buttons (CTAs)
```css
background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
color: white;
font-weight: 600;
```

### Gold Buttons (Secondary)
```css
background: linear-gradient(135deg, #D4AF37 0%, #c4a02f 100%);
color: #1a365d;
font-weight: 600;
```

### Feature Cards
```css
background: white;
border: 1px solid #1e3a5f;
border-radius: 12px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
transition: all 0.3s ease;
```

**Hover State:**
- Transform: translateY(-8px)
- Box Shadow: 0 12px 24px rgba(212, 175, 55, 0.15)
- Border Color: #D4AF37

### Stat Cards
```css
background: white;
border-radius: 12px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
padding: 30px 20px;
```

**Number Styling:**
- Background: linear-gradient(135deg, #D4AF37 0%, #1a365d 100%)
- -webkit-background-clip: text
- -webkit-text-fill-color: transparent
- Font Size: 3rem
- Font Weight: 800

### Feature Icons
```css
background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
inline-size: 64px;
block-size: 64px;
border-radius: 12px;
display: flex;
align-items: center;
justify-content: center;
color: white;
font-size: 2rem;
```

### Footer
```css
background: linear-gradient(135deg, #0B1F33 0%, #1a365d 100%);
color: white;
```

**Section Headings:** Gold (#D4AF37)
**Links:** White (0.5 opacity) with hover to higher opacity

---

## Typography

### Font Family
```css
font-family: 'Inter', sans-serif;
```

### Font Sizes & Weights
| Element | Size | Weight |
|---------|------|--------|
| Hero Title | 3.5rem (responsive: 2.5rem) | 800 |
| Section Title | 2.5rem | 700 |
| Card Title | 1.25rem | 700 |
| Body Text | 1rem | 400 |
| Small Text | 0.875rem | 500 |
| Labels | 1.1rem | 600 |

---

## Spacing & Layout

### Padding Values
- Small: 8px
- Medium: 12px - 16px
- Large: 20px - 32px
- XL: 60px

### Border Radius
- Small Elements: 6px
- Medium Elements: 8px
- Cards: 12px
- Buttons/Badges: 6px - 20px

### Box Shadows
```css
/* Light Shadow */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Medium Shadow */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

/* Hover Shadow */
box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);

/* Gold Glow */
box-shadow: 0 8px 16px rgba(212, 175, 55, 0.3);
```

---

## Component States

### Button States
```css
/* Normal */
background: gradient;
transition: all 0.3s ease;

/* Hover */
transform: translateY(-2px);
box-shadow: elevated;

/* Active */
background: darker-gradient;

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

### Tab States
```css
/* Inactive */
background: white;
color: #0B1F33;
border: 2px solid transparent;

/* Hover */
background: #f0f9ff;
border-color: #D4AF37;

/* Active */
background: linear-gradient(135deg, #D4AF37, #0891b2);
color: #0B1F33;
border-color: #D4AF37;
```

---

## Responsive Design

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Deskinset-block-start: > 1024px

### Responsive Text
```css
@media (max-width: 768px) {
    .hero-title { font-size: 2.5rem; }
    .hero-subtitle { font-size: 1.2rem; }
    .stat-number { font-size: 2rem; }
    .section-title { font-size: 2rem; }
}
```

### Grid Layout
```css
/* 1 column on mobile, 3 columns on desktop */
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
gap: 1.5rem;
```

---

## Implementation Checklist

- [x] Navbar with corporate gradient
- [x] Admin button in top right
- [x] Enhanced color palette
- [x] Premium gold accents
- [x] Smooth hover transitions
- [x] Feature card designs
- [x] Stats section
- [x] Footer gradient
- [x] Responsive design
- [x] Security layer for admin access
- [x] Payment ledger consolidated in admin

---

## Files Updated

### CSS Styling
- `/index.html` - Enhanced inline styles with new color palette
- `/admin.html` - Updated theme colors and tab styling

### JavaScript
- `/public/js/admin-access-control.js` - NEW security layer

### Documentation
- `WEBSITE_ENHANCEMENT_ADMIN_PORTAL.md` - Comprehensive guide
- `WEBSITE_THEME_REFERENCE.md` - This file

---

## Usage Examples

### Creating New Buttons
```html
<!-- Primary CTA -->
<a href="#" class="btn btn-primary btn-lg px-4">
    <span class="me-2">🚀</span> Get Started
</a>

<!-- Admin Action -->
<a href="/admin.html" class="btn btn-admin btn-sm">
    ⚙️ Admin Portal
</a>

<!-- Gold Accent -->
<button class="btn btn-gold btn-lg">
    Click Here
</button>
```

### Creating Feature Cards
```html
<div class="card feature-card">
    <div class="card-body p-4">
        <div class="feature-icon mx-auto">📊</div>
        <h5 class="card-title fw-bold">Feature Title</h5>
        <p class="card-text text-muted">Feature description...</p>
    </div>
</div>
```

### Creating Stat Cards
```html
<div class="stat-card">
    <div class="stat-number">10K+</div>
    <div class="stat-label">Active Users</div>
</div>
```

---

## Compliance & Branding

✅ **Brand Colors**: Premium corporate palette reflecting financial stability  
✅ **Trust Badges**: Gold elements convey premium, secure services  
✅ **African Focus**: Teal accent reflects modern, pan-African approach  
✅ **Accessibility**: High contrast ratios for WCAG compliance  
✅ **Performance**: No external styling libraries needed  

---

## Notes for Development

1. **Color Variables**: Always use CSS variables for colors to maintain consistency
2. **Transitions**: Keep animations to 0.3s for smooth UX
3. **Shadows**: Use provided shadow values for depth consistency
4. **Spacing**: Maintain 8px grid system for alignment
5. **Fonts**: Inter font already loaded via CDN
6. **Admin Access**: Always include admin-access-control.js for security

---

Last Updated: January 27, 2026  
Version: 1.0  
Status: ✅ Active
