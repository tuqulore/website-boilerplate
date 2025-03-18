import render from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";

export default {
  key: "11ty.js",
  compile: () => {
    return async function (data) {
      const content = await this.defaultRenderer(data);
      return render(jsx(content.type, content.props, content.key));
    };
  },
};
