export interface TraceTimeSettings {
	/** 档位 1：多少分钟内显示“刚刚”，0 = 关闭 */
	justNowMinutes: number;
	/** 档位 2：多少分钟内显示“N 分钟前”，0 = 关闭 */
	minutesAgoLimit: number;
	/** 档位 3：多少小时内显示“N 小时前”，0 = 关闭 */
	hoursAgoLimit: number;
	/** 档位 4：今天的块显示 HH:mm */
	todayTimeOnly: boolean;
	/** 档位 5：昨天的块显示“昨天 HH:mm” */
	yesterdayWithTime: boolean;
	/** 档位 6：多少天内显示“N 天前”，0 = 关闭 */
	daysAgoLimit: number;
	/** 档位 7：今年的块显示 MM-DD */
	thisYearShort: boolean;
	/** 回退格式：更早的块按此显示，支持 YYYY MM DD HH mm */
	dateFormat: string;
}

export const DEFAULT_SETTINGS: TraceTimeSettings = {
	justNowMinutes: 3,
	minutesAgoLimit: 60,
	hoursAgoLimit: 24,
	todayTimeOnly: false,
	yesterdayWithTime: true,
	daysAgoLimit: 0,
	thisYearShort: false,
	dateFormat: "YYYY-MM-DD HH:mm",
};

export function nowMinutes(): number {
	return Math.floor(Date.now() / 60000);
}

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

function applyFormat(format: string, d: Date): string {
	return format
		.replace(/YYYY/g, String(d.getFullYear()))
		.replace(/MM/g, pad2(d.getMonth() + 1))
		.replace(/DD/g, pad2(d.getDate()))
		.replace(/HH/g, pad2(d.getHours()))
		.replace(/mm/g, pad2(d.getMinutes()));
}

/** 本地日历日序号，用于计算“差几天”（按自然日而不是 24 小时）。 */
function daySerial(d: Date): number {
	return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

/**
 * 阶梯式显示规则：从上往下匹配，命中即停；某档关闭（阈值 0 / 开关关）
 * 则落到下一档，最后由完整日期格式兜底。
 * 纯显示层逻辑：存储的永远是分钟时间戳。
 */
export function formatTimestamp(
	minutes: number,
	settings: TraceTimeSettings,
	now: Date = new Date()
): string {
	const d = new Date(minutes * 60000);
	const diffMin = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 60000));

	// 1. 刚刚
	if (settings.justNowMinutes > 0 && diffMin < settings.justNowMinutes) return "刚刚";

	// 2. N 分钟前
	if (settings.minutesAgoLimit > 0 && diffMin < settings.minutesAgoLimit) {
		return `${diffMin} 分钟前`;
	}

	// 3. N 小时前
	const diffHours = Math.floor(diffMin / 60);
	if (settings.hoursAgoLimit > 0 && diffHours >= 1 && diffHours < settings.hoursAgoLimit) {
		return `${diffHours} 小时前`;
	}

	const dayDiff = daySerial(now) - daySerial(d);

	// 4. 今天 HH:mm
	if (settings.todayTimeOnly && dayDiff === 0) {
		return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
	}

	// 5. 昨天 HH:mm
	if (settings.yesterdayWithTime && dayDiff === 1) {
		return `昨天 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
	}

	// 6. N 天前
	if (settings.daysAgoLimit > 0 && dayDiff >= 1 && dayDiff <= settings.daysAgoLimit) {
		return `${dayDiff} 天前`;
	}

	// 7. 今年 MM-DD
	if (settings.thisYearShort && d.getFullYear() === now.getFullYear()) {
		return applyFormat("MM-DD", d);
	}

	// 回退：完整日期格式
	return applyFormat(settings.dateFormat || "YYYY-MM-DD HH:mm", d);
}
