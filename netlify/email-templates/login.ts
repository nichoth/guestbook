export function LoginTemplate (data:{
    loginLink:string;
    name:string;
}) {
    const { name, loginLink } = data

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html dir="ltr" lang="en">
        <head>
            <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
            <meta name="x-apple-disable-message-reformatting" />
        </head>

        <body>
            <h1>Hello, ${name}.</h1>
            <p>
                This is your single-use link to login on this machine.
            </p>

            <p>
                This machine will be authorized for a single session,
                meaning that you will be "logged out" on this device once
                you close the browser tab.
            </p>

            <!-- Action -->
            <table class="body-action" align="center" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <!-- Border based button https://litmus.com/blog/a-guide-to-bulletproof-buttons-in-email-design -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td align="center">
                                <p>
                                    <a href="${loginLink}" class="button">
                                        Click here login
                                    </a>
                                </p>
                                <p>
                                    This link is only valid for the next 5
                                    minutes.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            </table>

            <p>Thanks!</p>
        </body>
    </html>
    `
}
