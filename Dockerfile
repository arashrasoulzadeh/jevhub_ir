# جِو هاب — سایت استاتیک، سرو شده با nginx
FROM nginx:1.27-alpine

# صفحه‌ی ۴۰۴ سفارشی و کانفیگ nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# محتوای سایت
COPY index.html examples.html playground.html articles.html docs.html sitemap.xml robots.txt /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY docs/ /usr/share/nginx/html/docs/
COPY articles/ /usr/share/nginx/html/articles/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/index.html > /dev/null || exit 1
