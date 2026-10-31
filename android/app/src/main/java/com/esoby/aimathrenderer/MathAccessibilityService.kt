package com.esoby.aimathrenderer

import android.accessibilityservice.AccessibilityService
import android.graphics.Rect
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MathAccessibilityService : AccessibilityService() {
    private val prefs by lazy { getSharedPreferences("diagnostics", MODE_PRIVATE) }
    private val targetPackages = setOf("com.deepseek.chat", "com.larus.nova", "com.moonshot.kimichat", "ai.qwenlm.chat.android", "com.tencent.hunyuan.app.chat")
    private val maxNodes = 700
    private val maxChars = 24000

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!prefs.getBoolean("capture_enabled", false)) return
        if (event?.packageName?.toString() !in targetPackages) return
        // Ignore high-frequency selection/focus events; inspect after content/window/scroll changes.
        val root = rootInActiveWindow ?: return
        try {
            val output = StringBuilder()
            val count = intArrayOf(0)
            dumpNode(root, 0, output, count)
            val stamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
            val report = "采集时间：$stamp\n事件类型：${event.eventType}\n节点数：${count[0]}\n" +
                "说明：文本仅保存在本机 SharedPreferences，下一次采集会覆盖。\n\n$output"
            prefs.edit().putString("last_report", report.take(maxChars)).apply()
        } catch (_: Exception) {
            // A node may become stale while the target app is updating its UI.
        } finally {
            root.recycle()
        }
    }

    private fun dumpNode(
        node: AccessibilityNodeInfo,
        depth: Int,
        out: StringBuilder,
        count: IntArray
    ) {
        if (count[0] >= maxNodes || out.length >= maxChars) return
        count[0]++
        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        val text = node.text?.toString().orEmpty()
        val desc = node.contentDescription?.toString().orEmpty()
        val viewId = node.viewIdResourceName.orEmpty()
        val raw = when {
            text.isNotBlank() -> text
            desc.isNotBlank() -> " [desc=$desc]"
            else -> ""
        }
        val mathHits = findMathMarkers(raw)
        out.append("  ".repeat(depth.coerceAtMost(16)))
            .append("#").append(count[0])
            .append(" ").append(node.className ?: "?")
            .append(" id=").append(viewId)
            .append(" bounds=").append(bounds.flattenToString())
            .append(" visible=").append(node.isVisibleToUser)
            .append(" text=").append(raw.replace("\n", " ⏎ ").take(500))
        if (mathHits.isNotEmpty()) out.append("  <<< MATH: ").append(mathHits.joinToString(" | "))
        out.append('\n')

        for (i in 0 until node.childCount) {
            if (count[0] >= maxNodes || out.length >= maxChars) break
            val child = node.getChild(i) ?: continue
            try {
                dumpNode(child, depth + 1, out, count)
            } finally {
                child.recycle()
            }
        }
    }

    private fun findMathMarkers(text: String): List<String> {
        val patterns = listOf(
            Regex("""\\\[[\s\S]{1,300}?\\\]"""),
            Regex("""\\\([\s\S]{1,200}?\\\)"""),
            Regex("""\$\$[\s\S]{1,300}?\$\$"""),
            Regex("""\$[^\$\n]{1,160}\$"""),
            Regex("""\\begin\{(?:aligned|equation|gather|cases|matrix|pmatrix|bmatrix)\}""")
        )
        return patterns.flatMap { regex -> regex.findAll(text).map { it.value }.toList() }
            .distinct().take(8)
    }

    override fun onInterrupt() = Unit
}
