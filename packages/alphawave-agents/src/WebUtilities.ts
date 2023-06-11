import axios, { AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";
import TurndownService  from "turndown";

const ALLOWED_CONTENT_TYPES = [
    "text/html",
    "application/json",
    "application/xml",
    "application/javascript",
    "text/plain",
];


const DEFAULT_HEADERS = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.5",
    "Alt-Used": "LEAVE-THIS-KEY-SET-BY-TOOL",
    Connection: "keep-alive",
    Host: "LEAVE-THIS-KEY-SET-BY-TOOL",
    Referer: "https://www.google.com/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/111.0",
};

export class WebUtilities {
    public static  extractText(html: string, baseUrl: string, summarize: boolean): string {
        // Parse all elements including <noscript> tags
        const $ = cheerio.load(html, { scriptingEnabled: true });

        // If we want a summary, just get use the <body/>
        let text = '';
        $(`${summarize ? 'body ' : '*'}:not(style):not(script):not(svg)`).each((i, elem: any) => {
            // Remove any children to avoid duplicate text
            let content = $(elem).clone().children().remove().end().text().trim();
            const $el = $(elem);

            // Print links in markdown format
            let href = $el.attr("href");
            if ($el.prop("tagName")?.toLowerCase() === "a" && href) {
                if (!href.startsWith("http")) {
                    // Try converting to a relevant link
                    try {
                        href = new URL(href, baseUrl).toString();
                    } catch {
                        // Leave as is
                    }
                }

                // If the link has content, use that as the text
                const altText = $el.find("img[alt]").attr("alt")?.trim();
                if (altText) {
                    content += ` ${altText}`;
                }

                text += ` [${content}](${href})`;
            }
            // otherwise just print the content
            else if (content !== "") {
                text += ` ${content}`;
            }
        });

        // Remove newlines
        return text.trim().replace(/\n+/g, ' ');
    }

    public static htmlToMarkdown(html: string, baseUrl: string): string {
        // Parse HTML and remove scripts
        const $ = cheerio.load(html, { scriptingEnabled: true });

        // Remove scripts and convert relative links to absolute
        $('script').remove();
        $('a').each((i, elem) => {
            const $el = $(elem);
            const href = $el.attr("href");
            if (href && !href.startsWith("http")) {
                // Try converting to an absolute link
                try {
                    $el.attr("href", new URL(href, baseUrl).toString());
                } catch {
                    // Leave as is
                }
            }
        });

        // Convert to markdown
        const body = $('body').html() ?? '';
        const turndownService = new TurndownService();
        return turndownService.turndown(body);
    }

    public static async fetchPage(baseUrl: string, headers: Record<string,string>, config: AxiosRequestConfig): Promise<string> {
        const httpClient = axios.create({
            validateStatus: () => true,
        });

        // Clone headers to avoid mutating the original
        headers = Object.assign({}, DEFAULT_HEADERS, headers)

        // get hostname from url
        const host = new URL(baseUrl).hostname;
        headers['Host'] = host;
        headers['Alt-Used'] = host;

        // Fetch page and check for errors
        const response = await httpClient.get(baseUrl, {
            headers,
            ...config,
        });
        if (response.status >= 400) {
            throw new Error(`Site returned an HTTP status of ${response.status}`);
        }

        // Check for valid content type
        const contentType = response.headers['content-type'];
        const contentTypeArray = contentType.split(';');
        if (!contentTypeArray[0] || !ALLOWED_CONTENT_TYPES.includes(contentTypeArray[0])) {
            throw new Error(`Site returned an invalid content type of ${contentType}`);
        }

        return response.data;
    }
}
