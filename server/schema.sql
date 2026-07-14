-- AI PM Agent 数据库表结构
-- 在 Supabase SQL Editor 中执行

-- 1. 简历优化记录表
CREATE TABLE IF NOT EXISTS resume_optimizations (
  id BIGSERIAL PRIMARY KEY,
  original_resume TEXT NOT NULL,
  optimized_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 面试记录表
CREATE TABLE IF NOT EXISTS interview_records (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  evaluation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 面试题库表
CREATE TABLE IF NOT EXISTS interview_questions (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  key_points JSONB DEFAULT '[]',
  difficulty VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 用户偏好表（外观设置云同步）
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL UNIQUE,
  theme VARCHAR(20) DEFAULT 'dark',
  accent_color VARCHAR(10) DEFAULT '#6c63ff',
  font_size INTEGER DEFAULT 14,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_resume_created ON resume_optimizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_created ON interview_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_category ON interview_questions(category);

-- 启用 RLS
ALTER TABLE resume_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 允许匿名读写（简化版，生产环境应加认证）
CREATE POLICY "Allow all on resume" ON resume_optimizations FOR ALL USING (true);
CREATE POLICY "Allow all on interview" ON interview_records FOR ALL USING (true);
CREATE POLICY "Allow read on questions" ON interview_questions FOR SELECT USING (true);
CREATE POLICY "Allow all on preferences" ON user_preferences FOR ALL USING (true);
