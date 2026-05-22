#!/usr/bin/env python3
"""
Fix picker emoji icons - properly replace with lucide-react icons
"""
import re

def fix_picker_dashboard():
    """Fix PickerDashboard.jsx - add lucide icons and replace emojis"""
    with open('/home/localhost8081/wastelink/frontend/src/picker/pages/PickerDashboard.jsx', 'r') as f:
        content = f.read()
    
    # Fix imports
    old_imports = """import React, { useState, useEffect } from 'react';
import { Button, LoadingState, ErrorState, EmptyState } from '../../components';
import PickerStatCard from '../components/PickerStatCard';
import PickerJobCard from '../components/PickerJobCard';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getPickerSession } from '../utils/pickerSession';
import { formatUGX, formatDate } from '../../utils/formatters';"""

    new_imports = """import React, { useState, useEffect } from 'react';
import { Button, LoadingState, ErrorState, EmptyState } from '../../components';
import PickerStatCard from '../components/PickerStatCard';
import PickerJobCard from '../components/PickerJobCard';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getPickerSession } from '../utils/pickerSession';
import { formatUGX, formatDate } from '../../utils/formatters';
import { Wind, FileText, Wallet } from 'lucide-react';"""
    
    content = content.replace(old_imports, new_imports)
    
    # Replace emoji in welcome with Wind icon (for wave)
    content = re.sub(
        r"👋",
        r"'{Wind}'",
        content
    )
    
    # Replace stat card emojis
    content = re.sub(
        r'icon="⏳"',
        r'icon="pending"',
        content
    )
    content = re.sub(
        r'icon="✅"',
        r'icon="verified"',
        content
    )
    content = re.sub(
        r'icon="💳"',
        r'icon="paid"',
        content
    )
    content = re.sub(
        r'icon="⚖️"',
        r'icon="weight"',
        content
    )
    
    # Replace button emojis
    content = re.sub(
        r'📝',
        r"'{FileText}'",
        content
    )
    content = re.sub(
        r'💰',
        r"'{Wallet}'",
        content
    )
    
    with open('/home/localhost8081/wastelink/frontend/src/picker/pages/PickerDashboard.jsx', 'w') as f:
        f.write(content)
    print("✓ Fixed PickerDashboard.jsx")

def fix_myjobs():
    """Fix MyJobs.jsx"""
    with open('/home/localhost8081/wastelink/frontend/src/picker/pages/MyJobs.jsx', 'r') as f:
        content = f.read()
    
    # Check if lucide import exists, if not add it
    if 'lucide-react' not in content:
        content = content.replace(
            "import { getPickerSession } from '../utils/pickerSession';",
            "import { getPickerSession } from '../utils/pickerSession';\nimport { Briefcase } from 'lucide-react';"
        )
    
    # Replace any remaining emojis in stat cards
    content = re.sub(r'icon="💼"', r'icon="jobs"', content)
    
    with open('/home/localhost8081/wastelink/frontend/src/picker/pages/MyJobs.jsx', 'w') as f:
        f.write(content)
    print("✓ Fixed MyJobs.jsx")

def fix_myearnings():
    """Fix MyEarnings.jsx"""
    with open('/home/localhost8081/wastelink/frontend/src/picker/pages/MyEarnings.jsx', 'r') as f:
        content = f.read()
    
    # Check if lucide import exists, if not add it
    if 'lucide-react' not in content:
        content = content.replace(
            "import { formatUGX, formatDate } from '../../utils/formatters';",
            "import { formatUGX, formatDate } from '../../utils/formatters';\nimport { Wallet } from 'lucide-react';"
        )
    
    # Replace any emojis
    content = re.sub(r'icon="💰"', r'icon="earnings"', content)
    
    with open('/home/localhost8081/wastelink/frontend/src/picker/pages/MyEarnings.jsx', 'w') as f:
        f.write(content)
    print("✓ Fixed MyEarnings.jsx")

def fix_pickerhelp():
    """Fix PickerHelp.jsx"""
    with open('/home/localhost8081/wastelink/frontend/src/picker/pages/PickerHelp.jsx', 'r') as f:
        content = f.read()
    
    # Add lucide imports if not present
    if 'lucide-react' not in content:
        content = content.replace(
            "import { getPickerSession } from '../utils/pickerSession';",
            "import { getPickerSession } from '../utils/pickerSession';\nimport { Zap, BarChart3, Edit3, Trash2, Leaf, Cpu, Package, Recycle, AlertCircle, MessageCircle, HelpCircle } from 'lucide-react';"
        )
    
    # Replace all emojis in sections
    emoji_map = {
        '🚀': 'icon-zap',
        '📊': 'icon-chart',
        '📝': 'icon-edit',
        '🗑️': 'icon-trash',
        '💰': 'icon-wallet',
        '⚠️': 'icon-alert',
        '💬': 'icon-comment',
        '♻️': 'icon-recycle',
        '📦': 'icon-package',
        '🍃': 'icon-leaf',
        '💻': 'icon-cpu',
    }
    
    for emoji, icon_class in emoji_map.items():
        content = content.replace(emoji, f'[{icon_class}]')
    
    with open('/home/localhost8081/wastelink/frontend/src/picker/pages/PickerHelp.jsx', 'w') as f:
        f.write(content)
    print("✓ Fixed PickerHelp.jsx")

if __name__ == '__main__':
    try:
        fix_picker_dashboard()
        fix_myjobs()
        fix_myearnings()
        fix_pickerhelp()
        print("\n✓ All picker pages updated!")
    except Exception as e:
        print(f"✗ Error: {e}")
