package com.esoby.aimathrenderer

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {
    private val prefs by lazy { getSharedPreferences("diagnostics", MODE_PRIVATE) }
    private lateinit var status: TextView
    private lateinit var report: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 24)
        }
        val title = TextView(this).apply {
            text = "AI Math Renderer · Android 原型 0.1"
            textSize = 22f
        }
        status = TextView(this).apply { textSize = 15f; setPadding(0, 20, 0, 12) }
        val settingsButton = Button(this).apply {
            text = "打开无障碍服务设置"
            setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        }
        val enableButton = Button(this).apply {
            text = "开始 / 停止国产 AI App 节点诊断"
            setOnClickListener {
                val enabled = prefs.getBoolean("capture_enabled", false)
                prefs.edit().putBoolean("capture_enabled", !enabled).apply()
                updateStatus()
            }
        }
        val refreshButton = Button(this).apply {
            text = "刷新诊断结果"
            setOnClickListener { refreshReport() }
        }
        report = TextView(this).apply {
            textSize = 12f
            setTextIsSelectable(true)
            setPadding(0, 16, 0, 16)
        }
        root.addView(title)
        root.addView(status)
        root.addView(settingsButton)
        root.addView(enableButton)
        root.addView(refreshButton)
        root.addView(ScrollView(this).apply { addView(report) },
            LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
        updateStatus()
        refreshReport()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
        refreshReport()
    }

    private fun updateStatus() {
        val component = ComponentName(this, MathAccessibilityService::class.java)
        val enabledServices = Settings.Secure.getString(
            contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ).orEmpty()
        val serviceEnabled = enabledServices.split(':').any {
            it.equals(component.flattenToString(), ignoreCase = true)
        }
        val capture = prefs.getBoolean("capture_enabled", false)
        status.text = "无障碍服务：${if (serviceEnabled) "已开启" else "未开启"}\n" +
            "节点诊断：${if (capture) "运行中（DeepSeek / 豆包 / Kimi / 千问 / 元宝）" else "已停止"}\n" +
            "目标：DeepSeek、豆包、Kimi、通义千问、腾讯元宝"
    }

    private fun refreshReport() {
        report.text = prefs.getString("last_report", "尚无诊断数据。\n\n操作步骤：\n1. 开启无障碍服务。\n2. 点击“开始节点诊断”。\n3. 打开 DeepSeek、豆包、Kimi、通义千问或腾讯元宝，进入一条包含公式的回答。\n4. 返回本 App，点击“刷新诊断结果”。")
            ?: "尚无诊断数据。"
    }
}
