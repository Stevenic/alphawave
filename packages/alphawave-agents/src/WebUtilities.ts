import axios, { AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";

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

    public static async fetchPage(baseUrl: string, headers: Record<string,string>, config: AxiosRequestConfig, allowedContentTypes: string[]): Promise<string> {
        const httpClient = axios.create({
            validateStatus: () => true,
        });

        // Clone headers to avoid mutating the original
        headers = Object.assign({}, headers);

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
        if (!contentTypeArray[0] || !allowedContentTypes.includes(contentTypeArray[0])) {
            throw new Error(`Site returned an invalid content type of ${contentType}`);
        }

        return response.data;
    }
}
