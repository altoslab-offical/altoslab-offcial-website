#!/bin/bash
# ALTOS LAB 一鍵部署到 GitHub Pages
set -e

cd "/Users/kenhuang/Desktop/Claude_Project/Altoslab_official"

echo ""
echo "🚀 ALTOS LAB 部署工具"
echo "=========================="
echo ""

# Step 1: GitHub 登入
echo "📋 Step 1/3 - 登入 GitHub（會開啟瀏覽器）..."
gh auth login --web -h github.com

# Step 2: 建立 Repo 並推送
GITHUB_USER=$(gh api user -q .login)
REPO_NAME="altoslab-lab"

echo ""
echo "📦 Step 2/3 - 建立 GitHub Repository: $REPO_NAME ..."
gh repo create "$REPO_NAME" --public --source=. --remote=origin --push --description "ALTOS LAB - AI Studio" 2>/dev/null || \
  (git remote set-url origin "https://github.com/$GITHUB_USER/$REPO_NAME.git" && git push -u origin main)

# Step 3: 開啟 GitHub Pages
echo ""
echo "🌐 Step 3/3 - 開啟 GitHub Pages..."
gh api "repos/$GITHUB_USER/$REPO_NAME/pages" \
  -X POST \
  -f '{"source":{"branch":"main","path":"/"}}' \
  --silent 2>/dev/null || echo "Pages 可能已開啟"

echo ""
echo "✅ 完成！"
echo ""
echo "🔗 你的網站網址："
echo "   https://$GITHUB_USER.github.io/$REPO_NAME"
echo ""
echo "⏳ GitHub Pages 通常需要 1-3 分鐘生效"
