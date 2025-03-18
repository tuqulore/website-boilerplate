import render from "preact-render-to-string";

export default {
  key: "11ty.js",
  compile: () => {
    return async function (data) {
      const content = await this.defaultRenderer(data);
      return render(content);
    };
  },
};
