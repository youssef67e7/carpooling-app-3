# Mostaql Scrum + Gamification — Improved Documentation

نسخة مطوّرة من ملف PDF الأصلي (`900.pdf`) لمشروع التخرج AASTMT 2026.

## الملفات

| ملف | الوصف |
|-----|--------|
| `IMPROVED_DOCUMENTATION.md` | الوثيقة الكاملة المحسّنة (مصدر Markdown) |
| **`Mostaql_Scrum_Gamification_v2.1.pdf`** | **النسخة الأحدث — مع مخططات Figures 1–3** |
| `Mostaql_Scrum_Gamification_v2.pdf` | نسخة سابقة بدون صور المخططات |
| `build_pdf.py` | توليد PDF (يحمّل المخططات تلقائياً إن لزم) |
| `fetch_mermaid_ink.py` | تحميل صور Mermaid من mermaid.ink |
| `diagrams/*.png` | Figures 1–3 |
| `_build_documentation.html` | HTML وسيط (يُنشأ تلقائياً) |

## التحسينات في v2.0

- إكمال قسم **الأهداف** بأسئلة بحثية ومعايير نجاح قابلة للقياس
- إصلاح الاقتباس المقطوع بين الصفحات
- جداول للمخاطر والتدخلات و KPIs
- مخططات **Mermaid** (دورة Scrum، Risk، Architecture)
- خوارزمية **Fair Play** مفاهيمية
- أمان الخصوصية، خارطة تنفيذ، مراجع
- ملحق Glossary + Changelog

## إعادة توليد PDF

```powershell
cd "c:\Users\DELL\Desktop\ReachNative Car\docs\graduation-projects\mostaql-scrum-gamification"
python fetch_mermaid_ink.py   # اختياري — تحديث الصور
python build_pdf.py
```

يُنشئ `Mostaql_Scrum_Gamification_v2.1.pdf` عبر Edge/Chrome headless مع **3 مخططات مدمجة**.

## الخطوة التالية (اختياري)

- إضافة **Figure 1** من الـ BPMN infographic الأصلي داخل القسم 11
- ترجمة **Executive Summary** للعربية في صفحة منفصلة للمناقشة
