# Project Context - Zepp OS v1.0

> ⚠️ **MANDATORY** - Do not deviate from this document.

## API Version

- **Target**: Zepp OS v1.0 (API_LEVEL 1.0)
- **Reference**: https://docs.zepp.com/docs/1.0/intro/
- **DO NOT** use features from v2.0, v3.0, v4.0, or later versions

---

## Page Lifecycle (v1.0 Only)

These are the **only** valid page lifecycle methods in v1.0:

```js
Page({
  onInit(params) {
    // Initialize page - called when page loads
  },
  
  build() {
    // Draw UI - called to render the page
  },
  
  onDestroy() {
    // Cleanup - called when page is destroyed
  }
})
```

### ❌ NOT Available in v1.0

The following methods **DO NOT EXIST** in v1.0 and will cause runtime errors:

| Method | Status | Notes |
|--------|--------|-------|
| `onShow` | ❌ Not available | Exists in v2.0+ |
| `onHide` | ❌ Not available | Exists in v2.0+ |
| `onResume` | ❌ Not available | Exists in v3.0+ |
| `onPause` | ❌ Not available | Exists in v3.0+ |

---

## Valid APIs for v1.0

### File System
- `hmFS.open(path, flags)` - Open file in `/data` directory
- `hmFS.read(fd, buffer, pos, len)` - Read file
- `hmFS.write(fd, buffer, pos, len)` - Write file
- `hmFS.close(fd)` - Close file
- `hmFS.stat(path)` - Get file info
- `hmFS.remove(path)` - Delete file

### UI
- `hmUI.createWidget(type, props)` - Create UI widgets
- Widget types: `TEXT`, `BUTTON`, `FILL_RECT`, `SCROLL_LIST`, `IMG`, etc.

### Navigation
- `hmApp.gotoPage({ url: 'page/name' })` - Navigate to page
- `hmApp.reloadPage()` - Reload current page

### Device Info
- `hmSetting.getDeviceInfo()` - Get screen dimensions

---

## Common Mistakes to Avoid

1. **Using `onShow` for data loading** → Use `onInit` instead
2. **Using newer API methods** → Check docs for v1.0 compatibility
3. **Assuming async file I/O** → Zepp OS v1.0 uses synchronous `hmFS` APIs

---

## Quick Reference Links

- [Life Cycle](https://docs.zepp.com/docs/1.0/guides/framework/device/life-cycle/)
- [Registration Page](https://docs.zepp.com/docs/1.0/guides/framework/device/page/)
- [hmFS API](https://docs.zepp.com/docs/1.0/reference/device-app-api/hmFS/open/)
- [UI Widgets](https://docs.zepp.com/docs/1.0/reference/device-app-api/hmUI/)

---

## Enforcement

Before implementing any page logic:
1. Verify all lifecycle methods are in the v1.0 list above
2. Check API references use `/docs/1.0/` paths
3. Run tests and verify on real device before assuming it works
