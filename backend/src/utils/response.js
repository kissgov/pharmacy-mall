/**
 * 统一响应格式工具
 *
 * 所有 API 接口均使用此工具返回统一结构的 JSON 响应：
 *   { code: number, data: any, message: string }
 */

/**
 * 成功响应
 * @param {*} data - 返回的数据
 * @param {string} message - 提示信息
 * @returns {{ code: 200, data: *, message: string }}
 */
function success(data, message = 'ok') {
  return { code: 200, data, message };
}

/**
 * 错误响应
 * @param {number} code - HTTP 状态码
 * @param {string} message - 错误描述
 * @param {*} data - 附加数据
 * @returns {{ code: number, data: *, message: string }}
 */
function error(code = 500, message = '服务器错误', data = null) {
  return { code, data, message };
}

/**
 * 分页响应
 * @param {Array} list - 数据列表
 * @param {number} total - 总记录数
 * @param {string} message - 提示信息
 * @returns {{ code: 200, data: { list: Array, total: number }, message: string }}
 */
function paginated(list, total, message = 'ok') {
  return {
    code: 200,
    data: { list, total },
    message,
  };
}

module.exports = { success, error, paginated };
