export = useProxy;
/**
 * **Set a proxy to use in a given page or request.**
 * 
 * **Example:**
 * ```javascript
 * const proxy = "https://127.0.0.1:80";
 * const page = await browser.newPage();
 * await useProxy(page, proxy);
 * ```
 * @param page 'Page' or 'Request' object to set a proxy for.
 * @param proxy Proxy to use in the current page. Must begin with a protocol e.g. **http://**, **https://**, **socks://**.
 */
declare function useProxy(page: object, proxy: string | object): Promise<any>;
declare namespace useProxy {
	/**
	 * **Request data from a lookupservice.**
	 *
	 * **Example:**
	 * ```javascript
	 * await useProxy(page, proxy);
	 * const data = await useProxy.lookup(page);
	 * console.log(data.ip);
	 * ```
	 * @param page 'Page' object to execute the request on.
	 * @param lookupServiceUrl External lookup service to request data from. Fetches data from `api64.ipify.org` by default.
	 * @param isJSON Whether to JSON.parse the received response. Defaults to `true`.
	 * @param timeout Time in milliseconds after which the request times out. Defaults to `30000` ms.
	 */
	function lookup(page: object, lookupServiceUrl?: string, isJSON?: boolean, timeout?: number | string): Promise<any>;
}


import { PuppeteerExtraPlugin } from 'puppeteer-extra-plugin';
import { HTTPRequest } from 'puppeteer';
import { Response as GotResponse, Options as GotOptions } from 'got';

declare export function getProxiedResponse(request: HTTPRequest, proxy: string, overrides?: {
	url?: GotOptions['url'];
	method?: GotOptions['method'];
	postData?: GotOptions['body'];
	headers?: GotOptions['headers'];
}): Promise<{
	status: GotResponse['statusCode'];
	headers: GotResponse['headers'];
	body: GotResponse['body'];
}>;

declare interface PuppeteerPageProxyOptions {
	onlyNavigation?: boolean;
	interceptResolutionPriority?: number;
}

type PageProxyPluginPageAdditions = {
	useProxy: (proxyUrl: string | null, options?: PuppeteerPageProxyOptions) => Promise<void>;
};

declare class PuppeteerPageProxyPlugin extends PuppeteerExtraPlugin {
	constructor(proxyUrl?: string, opts?: Partial<PuppeteerPageProxyOptions>)
	get name(): string
	get defaults(): PuppeteerPageProxyOptions & { proxyUrl?: string }
	get proxyUrl(): boolean | undefined;
	get onlyNavigation(): boolean | undefined;
	get interceptResolutionPriority(): number | undefined;
}

declare const _default: (proxyUrl?: string, opts?: Partial<PuppeteerPageProxyOptions>) => PuppeteerPageProxyPlugin;

export default _default;

declare module 'puppeteer' {
	interface Page extends PageProxyPluginPageAdditions { };
}

declare module 'puppeteer-core' {
	interface Page extends PageProxyPluginPageAdditions { };
}