#!/usr/bin/env python3
"""
Properly replace picker page emojis with lucide-react icons
"""
import re

def update_picker_dashboard():
    """Update PickerDashboard.jsx with lucide icons"""
    path = '/home/localhost8081/wastelink/frontend/src/picker/pages/PickerDashboard.jsx'
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add lucide imports
    if 'lucide-react' not in content:
        content = content.replace(
            "import { formatUGX } from '../../utils/formatters';",
            "import { formatUGX } from '../../utils/formatters';\nimport { Wind, FileText, Wallet } from 'lucide-react';"
        )
    
    # Replace emoji with icon in welcome text
    content = content.replace(
        "Welcome, {picker.name}! 👋",
        "Welcome, {picker.name}! <Wind className=\"inline-block w-5 h-5 text-green-700\" />"
    )
    
    # Fix the JSX - replace text emoji with actual icon component
    # Find the welcome section and replace it properly
    old_welcome = """<h2 className="text-xl font-bold text-gray-900">
              Welcome, {picker.name}! <Wind className="inline-block w-5 h-5 text-green-700" />
            </h2>"""
    
    # Simpler replacement - just fix the inline style
    pattern = r'Welcome, \{picker\.name\}! <Wind className="inline-block w-5 h-5 text-green-700" />'
    if re.search(pattern, content):
        content = re.sub(
            pattern,
            'Welcome, {picker.name}!',
            content
        )
        # Add icon separately after h2
        content = content.replace(
            'Welcome, {picker.name}!</h2>',
            'Welcome, {picker.name}! <Wind className="inline w-4 h-4 text-green-700" /></h2>'
        )
    
    # Replace button emojis with proper icon components
    content = re.sub(
        r'📝 Log Waste',
        r'<FileText className="w-5 h-5" /> Log Waste',
        content
    )
    
    content = re.sub(
        r'💰 My Earnings',
        r'<Wallet className="w-5 h-5" /> My Earnings',
        content
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Updated PickerDashboard.jsx")

def update_picker_help():
    """Update PickerHelp.jsx with lucide icons"""
    path = '/home/localhost8081/wastelink/frontend/src/picker/pages/PickerHelp.jsx'
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add lucide imports
    if 'lucide-react' not in content:
        content = content.replace(
            "import { getPickerSession } from '../utils/pickerSession';",
            "import { getPickerSession } from '../utils/pickerSession';\nimport { Zap, BarChart3, FileText, Trash2, Recycle, Package, Leaf, Cpu, Wallet } from 'lucide-react';"
        )
    
    # Replace section header emojis
    replacements = [
        ('🚀 Getting Started', '<Zap className="inline w-5 h-5 text-green-700 mr-2" /> Getting Started'),
        ('📊 Understanding Job Status', '<BarChart3 className="inline w-5 h-5 text-blue-700 mr-2" /> Understanding Job Status'),
        ('📝 What\'s a Job Code?', '<FileText className="inline w-5 h-5 text-blue-700 mr-2" /> What\'s a Job Code?'),
        ('🗑️ Types of Waste We Accept', '<Trash2 className="inline w-5 h-5 text-gray-700 mr-2" /> Types of Waste We Accept'),
        ('💰 How Earnings Work', '<Wallet className="inline w-5 h-5 text-green-700 mr-2" /> How Earnings Work'),
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
    
    # Replace waste type emojis
    waste_replacements = [
        ('<span>♻️</span>', '<Recycle className="w-5 h-5 text-green-600" />'),
        ('<span>📦</span>', '<Package className="w-5 h-5 text-amber-600" />'),
        ('<span>🍃</span>', '<Leaf className="w-5 h-5 text-green-600" />'),
        ('<span>💻</span>', '<Cpu className="w-5 h-5 text-blue-600" />'),
    ]
    
    for old, new in waste_replacements:
        content = content.replace(old, new)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Updated PickerHelp.jsx")

if __name__ == '__main__':
    try:
        update_picker_dashboard()
        update_picker_help()
        print("\n✓ All picker pages updated with lucide-react icons!")
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
