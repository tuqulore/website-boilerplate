import render from "preact-render-to-string";

export const template = {
  key: "11ty.js",
  compile: () => {
    return async function (data) {
      let content = await this.defaultRenderer(data);
      return render(content);
    };
  },
};

export const hydrate = {
  ...template,
  outputFileExtension: "hydrate.html",
  useLayouts: false,
};
