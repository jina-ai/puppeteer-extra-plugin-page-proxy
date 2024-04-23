'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin');
const getProxiedResponse = require('./core/proxy');

/**
 * Block resources (images, media, css, etc.) in puppeteer.
 *
 * Supports all resource types, blocking can be toggled dynamically.
 *
 * @param {Object} opts - Options
 * @param {Set<string>} [opts.blockedTypes] - Specify which resourceTypes to block (by default none)
 *
 * @example
 * const { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } = require('puppeteer')
 * puppeteer.use(require('puppeteer-extra-plugin-block-resources')({
 *   blockedTypes: new Set(['image', 'stylesheet']),
 *   // Optionally enable Cooperative Mode for several request interceptors
 *   interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
 * }))
 *
 * //
 * // and/or dynamically:
 * //
 *
 * const blockResourcesPlugin = require('puppeteer-extra-plugin-block-resources')()
 * puppeteer.use(blockResourcesPlugin)
 *
 * const browser = await puppeteer.launch({ headless: false })
 * const page = await browser.newPage()
 *
 * blockResourcesPlugin.blockedTypes.add('image')
 * await page.goto('http://www.msn.com/', {waitUntil: 'domcontentloaded'})
 *
 * blockResourcesPlugin.blockedTypes.add('stylesheet')
 * blockResourcesPlugin.blockedTypes.add('other') // e.g. favicon
 * await page.goto('http://news.ycombinator.com', {waitUntil: 'domcontentloaded'})
 *
 * blockResourcesPlugin.blockedTypes.delete('stylesheet')
 * blockResourcesPlugin.blockedTypes.delete('other')
 * blockResourcesPlugin.blockedTypes.add('media')
 * blockResourcesPlugin.blockedTypes.add('script')
 * await page.goto('http://www.youtube.com', {waitUntil: 'domcontentloaded'})
 */
class PuppeteerPageProxyPlugin extends PuppeteerExtraPlugin {
    constructor(proxyUrl, opts = {}) {
        super(typeof proxyUrl === 'string' ? { ...opts, proxyUrl } : { ...proxyUrl });

        this.proxyCfgMap = new WeakMap();
        this.reqHdlRegSet = new WeakSet();
    }

    /**
     * @override
     */
    get name() {
        return 'page-proxy';
    }

    /**
     * @override
     */
    get defaults() {
        return {
            proxyUrl: undefined,
            interceptResolutionPriority: undefined,
            onlyNavigation: undefined,
        };
    }

    /**
     * Get global proxy url.
     *
     * @type {string} - The global proxy url.
     */
    get proxyUrl() {
        return this.opts.proxyUrl;
    }

    /**
     * Get global onlyNavigation flag.
     *
     * @type {boolean} - Whether to only proxy navigation requests.
     */
    get onlyNavigation() {
        return this.opts.onlyNavigation;
    }

    /**
     * Get the global request interception resolution priority.
     *
     * Priority for Cooperative Intercept Mode can be configured either through `opts` or by modifying this property.
     *
     * @type {number} - A number for the request interception resolution priority.
     */
    get interceptResolutionPriority() {
        return this.opts.interceptResolutionPriority;
    }

    /**
     * @private
     */
    async onRequest(page, request) {
        // Requests are immediately handled if not using Cooperative Intercept Mode
        const alreadyHandled = request.isInterceptResolutionHandled
            ? request.isInterceptResolutionHandled()
            : true;

        this.debug('onRequest', {
            type,
            shouldBlock,
            alreadyHandled
        });

        if (alreadyHandled) {
            return;
        }

        const {
            proxy: localProxyUrl,
            onlyNavigation: localOnlyNavigation,
            interceptResolutionPriority: localInterceptResolutionPriority
        } = this.proxyCfgMap.get(page);

        const interceptResolutionPriority = localInterceptResolutionPriority || this.interceptResolutionPriority;
        const onlyNavigation = localOnlyNavigation || this.onlyNavigation;

        do {
            if (!localProxyUrl && localProxyUrl !== undefined) {
                break;
            }

            const proxyUrl = localProxyUrl || this.proxyUrl;
            if (!proxyUrl) {
                break;
            }
            if (onlyNavigation && !request.isNavigationRequest()) {
                break;
            }

            try {
                const respondWith = await getProxiedResponse(request, proxyUrl);

                return request.respond(respondWith, interceptResolutionPriority);
            } catch (err) {
                this.debug('onProxyError', { error: err, proxy: localProxyUrl });
                return request.abort('failed', interceptResolutionPriority);
            }

        } while (false)

        const continueArgs = request.continueRequestOverrides
            ? [request.continueRequestOverrides(), interceptResolutionPriority]
            : [];

        return request.continue(...continueArgs);
    }

    /**
     * @private
     * @override
     */
    async onPageCreated(page) {
        this.debug('onPageCreated', { proxy: this.proxyUrl });

        page.useProxy = (proxyUrl, opts = {}) => {
            this.proxyCfgMap.set(page, {
                // ...this.proxyCfgMap.get(page),
                ...opts,
                proxy: proxyUrl,
            });
            if (!this.reqHdlRegSet.has(page)) {
                page.on('request', this.onRequest.bind(this, page));
                this.reqHdlRegSet.add(page);
            }
            return page.setRequestInterception(true);
        };

        if (this.proxyUrl) {
            await page.useProxy();
        }
    }
}

module.exports = function (arg1, arg2) {
    return new PuppeteerPageProxyPlugin(arg1, arg2);
}
module.exports.getProxiedResponse = getProxiedResponse;
module.exports.PuppeteerPageProxyPlugin = PuppeteerPageProxyPlugin;