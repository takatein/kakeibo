import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IconType } from 'react-icons';
import {
  LuSchool,
  LuBookOpen,
  LuBuilding2,
  LuGraduationCap,
  LuTrendingDown,
  LuRefreshCw,
  LuTriangleAlert,
  LuBrain,
  LuHouse,
} from 'react-icons/lu';
import { getFamilySettings } from '../../api/family-settings';
import { getFixedCosts } from '../../api/fixed-costs';
import { getApprovedPatterns } from '../../api/knowledge';
import { formatManYen, formatCurrency } from '../../utils/format';
import type { FamilySettings, FixedCost, PatternKnowledge } from '../../types';

interface Insight {
  type: 'warning' | 'info' | 'success';
  icon: IconType;
  title: string;
  body: string;
  action?: string;
  link?: string;
}

export function InsightsCard() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateInsights();
  }, []);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const [settings, fixedCosts, patterns] = await Promise.all([
        getFamilySettings(),
        getFixedCosts(),
        getApprovedPatterns(),
      ]);
      const generated = buildInsights(settings, fixedCosts, patterns);
      setInsights(generated);
    } catch (err) {
      console.error('Failed to generate insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold px-1" style={{ color: '#1E3A5F' }}>AIインサイト</h3>
      {insights.map((insight, i) => {
        const Icon = insight.icon;
        const iconColor =
          insight.type === 'warning' ? '#E67E22' :
          insight.type === 'success' ? '#059669' : '#2E86C1';

        return (
          <button
            key={i}
            onClick={() => insight.link && navigate(insight.link)}
            className="card w-full text-left flex items-start gap-3"
            style={{
              borderLeft: `4px solid ${iconColor}`,
            }}
          >
            <Icon size={18} color={iconColor} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: '#1E3A5F' }}>{insight.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{insight.body}</p>
            </div>
            {insight.link && (
              <span className="text-slate-300 shrink-0 mt-1">›</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function buildInsights(
  settings: FamilySettings,
  fixedCosts: FixedCost[],
  patterns: PatternKnowledge[],
): Insight[] {
  const insights: Insight[] = [];
  const currentYear = new Date().getFullYear();
  const selfAge = currentYear - settings.members.self.birthYear;

  // 1. 教育費ピーク警告（子供の入学タイミング）
  for (const [key, child] of Object.entries(settings.members)) {
    if (!key.startsWith('child') || !child) continue;
    const childAge = currentYear - (child as any).birthYear;
    const childName = (child as any).name || key;

    // 今後3年以内の入学イベント
    for (let futureAge = childAge; futureAge <= childAge + 3; futureAge++) {
      const yearsFromNow = futureAge - childAge;
      if (yearsFromNow <= 0) continue;

      if (futureAge === 6) {
        insights.push({
          type: 'info',
          icon: LuSchool,
          title: `${childName} 小学校入学まであと${yearsFromNow}年`,
          body: '教育費の準備を検討しましょう',
          link: '/simulator',
        });
      } else if (futureAge === 12) {
        insights.push({
          type: 'warning',
          icon: LuBookOpen,
          title: `${childName} 中学入学まであと${yearsFromNow}年`,
          body: `私立の場合、年間約${formatManYen(1200000)}の教育費がかかります`,
          link: '/simulator',
        });
      } else if (futureAge === 15) {
        insights.push({
          type: 'info',
          icon: LuBuilding2,
          title: `${childName} 高校入学まであと${yearsFromNow}年`,
          body: `年間約${formatManYen(1000000)}の教育費を見込んでください`,
          link: '/simulator',
        });
      } else if (futureAge === 18) {
        insights.push({
          type: 'warning',
          icon: LuGraduationCap,
          title: `${childName} 大学入学まであと${yearsFromNow}年`,
          body: `年間約${formatManYen(1750000)}。入学金も含めると初年度は高額になります`,
          link: '/simulator',
        });
      }
    }
  }

  // 2. キャリアイベント警告
  if (selfAge >= 53 && selfAge < 55) {
    insights.push({
      type: 'warning',
      icon: LuTrendingDown,
      title: '役職定年が近づいています',
      body: `${55 - selfAge}年後に年収が約10%減少する可能性があります。シミュレーターで影響を確認しましょう`,
      link: '/simulator',
    });
  }

  if (selfAge >= 58 && selfAge < 60) {
    insights.push({
      type: 'warning',
      icon: LuRefreshCw,
      title: '再雇用への移行が近づいています',
      body: '60歳以降は年収が大幅に変わります。資金計画を見直しましょう',
      link: '/simulator',
    });
  }

  // 3. 固定費の最適化提案
  const monthlyFixed = fixedCosts.filter(c => c.isActive).reduce((sum, c) => sum + c.amount, 0);
  const monthlyIncome = settings.income.selfMonthlyNet + settings.income.spouseMonthlyNet;
  if (monthlyIncome > 0 && monthlyFixed / monthlyIncome > 0.5) {
    insights.push({
      type: 'warning',
      icon: LuTriangleAlert,
      title: '固定費が収入の50%を超えています',
      body: `固定費 ${formatCurrency(monthlyFixed)}/月は収入の${Math.round(monthlyFixed / monthlyIncome * 100)}%。見直しを検討しましょう`,
      link: '/knowledge',
    });
  }

  // 4. パターン学習の成果
  if (patterns.length > 0) {
    insights.push({
      type: 'success',
      icon: LuBrain,
      title: `${patterns.length}件のパターンを学習済み`,
      body: 'AIがあなたの買い物パターンを理解しています。分類精度が向上しています',
      link: '/knowledge',
    });
  }

  // 5. 住宅ローン完済予定
  if (settings.loan.monthlyPayment > 0 && settings.loan.remainingMonths > 0) {
    const monthsLeft = settings.loan.remainingMonths;
    const yearsLeft = Math.round(monthsLeft / 12);
    const completionAge = selfAge + yearsLeft;

    if (completionAge > 60) {
      insights.push({
        type: 'warning',
        icon: LuHouse,
        title: `住宅ローン完済は${completionAge}歳`,
        body: '定年後もローンが残ります。繰り上げ返済を検討しましょう',
        link: '/simulator',
      });
    } else if (yearsLeft <= 5) {
      insights.push({
        type: 'success',
        icon: LuHouse,
        title: `住宅ローン完済まであと${yearsLeft}年`,
        body: `完済後は月${formatCurrency(settings.loan.monthlyPayment)}の余裕が生まれます`,
        link: '/simulator',
      });
    }
  }

  // 最大4件に絞る（警告優先）
  insights.sort((a, b) => {
    const priority = { warning: 0, info: 1, success: 2 };
    return priority[a.type] - priority[b.type];
  });

  return insights.slice(0, 4);
}
